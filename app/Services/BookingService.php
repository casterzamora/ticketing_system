<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\BookingTicket;
use App\Models\Event;
use App\Models\Payment;
use App\Models\RefundRequest;
use App\Models\TicketType;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Booking Service
 * 
 * This service handles all booking-related business logic including
 * booking creation, payment processing, cancellation, and refunds.
 * It ensures data integrity and business rule compliance.
 * 
 * Business Rules:
 * - Use database transactions for all operations
 * - Prevent double booking
 * - Manage ticket inventory accurately
 * - Handle payment processing workflows
 * - Support refund request creation
 */
class BookingService
{
    /**
     * Create a new booking.
     * 
     * This method handles the complete booking creation process including
     * ticket inventory management and booking reference generation.
     * 
     * @param array $data
     * @return Booking|null
     */
    public static function createBooking(array $data): ?Booking
    {
        try {
            DB::beginTransaction();

            // Generate unique booking reference
            $bookingReference = self::generateBookingReference();

            // Create booking
            $booking = Booking::create([
                'booking_reference' => $bookingReference,
                'user_id' => $data['user_id'],
                'event_id' => $data['event_id'],
                'customer_name' => $data['customer_name'],
                'customer_email' => $data['customer_email'],
                'customer_phone' => $data['customer_phone'] ?? null,
                'special_requirements' => $data['special_requirements'] ?? null,
                'total_tickets' => $data['total_tickets'],
                'total_amount' => $data['total_amount'],
                'status' => 'pending',
            ]);

            // Create booking tickets and update inventory
            foreach ($data['tickets'] as $ticketTypeId => $quantity) {
                if ($quantity > 0) {
                    $ticketType = TicketType::findOrFail($ticketTypeId);
                    
                    // Create booking ticket record
                    BookingTicket::create([
                        'booking_id' => $booking->id,
                        'ticket_type_id' => $ticketTypeId,
                        'quantity' => $quantity,
                        'price_per_ticket' => $ticketType->price,
                        'total_price' => $ticketType->price * $quantity,
                    ]);

                    // Update ticket type sold quantity
                    $ticketType->increaseSoldQuantity($quantity);
                }
            }

            DB::commit();

            return $booking;

        } catch (\Exception $e) {
            DB::rollBack();
            
            \Log::error('Booking creation failed: ' . $e->getMessage(), [
                'data' => $data,
                'trace' => $e->getTraceAsString()
            ]);
            
            return null;
        }
    }

    /**
     * Process payment for a booking.
     * 
     * This method handles payment processing and booking confirmation.
     * In a real application, this would integrate with payment gateways.
     * 
     * @param Booking $booking
     * @param string $paymentMethod
     * @return Payment|null
     */
    public static function processPayment(Booking $booking, string $paymentMethod): ?Payment
    {
        try {
            DB::beginTransaction();

            // Create payment record
            $payment = Payment::create([
                'booking_id' => $booking->id,
                'amount' => $booking->total_amount,
                'currency' => 'USD',
                'status' => 'pending',
                'payment_method' => $paymentMethod,
                'gateway' => self::getPaymentGateway($paymentMethod),
                'transaction_id' => self::generateTransactionId(),
            ]);

            // Simulate payment processing (in real app, integrate with payment gateway)
            $paymentSuccess = self::simulatePaymentProcessing($payment);

            if ($paymentSuccess) {
                // Mark payment as successful
                $payment->markAsSuccessful();

                // Confirm booking
                $booking->confirm();

                DB::commit();

                return $payment;
            } else {
                // Mark payment as failed
                $payment->markAsFailed();

                DB::rollBack();

                return $payment;
            }

        } catch (\Exception $e) {
            DB::rollBack();
            
            \Log::error('Payment processing failed: ' . $e->getMessage(), [
                'booking_id' => $booking->id,
                'payment_method' => $paymentMethod,
                'trace' => $e->getTraceAsString()
            ]);
            
            return null;
        }
    }

    /**
     * Cancel a booking.
     * 
     * This method handles booking cancellation and ticket inventory restoration.
     * 
     * @param Booking $booking
     * @return bool
     */
    public static function cancelBooking(Booking $booking): bool
    {
        try {
            DB::beginTransaction();

            // Check if booking can be cancelled
            if (!$booking->isCancellable()) {
                return false;
            }

            // Release ticket quantities
            foreach ($booking->bookingTickets as $bookingTicket) {
                $ticketType = $bookingTicket->ticketType;
                $ticketType->decreaseSoldQuantity($bookingTicket->quantity);
            }

            // Update booking status
            $booking->status = 'cancelled';
            $booking->save();

            // Create refund payment if payment was successful
            $successfulPayment = $booking->successfulPayment();
            if ($successfulPayment) {
                $refundPayment = $successfulPayment->createRefund(
                    $successfulPayment->amount,
                    'cancellation'
                );

                if ($refundPayment) {
                    $refundPayment->markAsSuccessful();
                }
            }

            DB::commit();

            return true;

        } catch (\Exception $e) {
            DB::rollBack();
            
            \Log::error('Booking cancellation failed: ' . $e->getMessage(), [
                'booking_id' => $booking->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return false;
        }
    }

    /**
     * Create a refund request for a booking.
     * 
     * This method creates a refund request with validation
     * and business rule enforcement.
     * 
     * @param Booking $booking
     * @param string $reason
     * @return RefundRequest|null
     */
    public static function createRefundRequest(Booking $booking, string $reason): ?RefundRequest
    {
        try {
            // Check if booking is refundable
            if (!$booking->isRefundable()) {
                return null;
            }

            // Check if refund request already exists
            if ($booking->refundRequest) {
                return null;
            }

            // Create refund request
            $refundRequest = RefundRequest::create([
                'booking_id' => $booking->id,
                'refund_amount' => $booking->total_amount,
                'reason' => $reason,
                'status' => 'pending',
            ]);

            return $refundRequest;

        } catch (\Exception $e) {
            \Log::error('Refund request creation failed: ' . $e->getMessage(), [
                'booking_id' => $booking->id,
                'reason' => $reason,
                'trace' => $e->getTraceAsString()
            ]);
            
            return null;
        }
    }

    /**
     * Generate a unique booking reference.
     * 
     * This method creates a unique booking reference number
     * in the format BK-YYYY-XXXXX.
     * 
     * @return string
     */
    private static function generateBookingReference(): string
    {
        do {
            $reference = 'BK-' . date('Y') . '-' . strtoupper(Str::random(5));
        } while (Booking::where('booking_reference', $reference)->exists());

        return $reference;
    }

    /**
     * Generate a unique transaction ID.
     * 
     * This method creates a unique transaction ID for payment processing.
     * 
     * @return string
     */
    private static function generateTransactionId(): string
    {
        return 'TXN-' . time() . '-' . rand(1000, 9999);
    }

    /**
     * Get payment gateway for payment method.
     * 
     * This method returns the appropriate payment gateway
     * based on the payment method.
     * 
     * @param string $paymentMethod
     * @return string
     */
    private static function getPaymentGateway(string $paymentMethod): string
    {
        return match($paymentMethod) {
            'credit_card', 'debit_card' => 'stripe',
            'paypal' => 'paypal',
            'bank_transfer' => 'bank',
            default => 'manual'
        };
    }

    /**
     * Simulate payment processing.
     * 
     * This method simulates payment gateway processing.
     * In a real application, this would integrate with actual payment gateways.
     * 
     * @param Payment $payment
     * @return bool
     */
    private static function simulatePaymentProcessing(Payment $payment): bool
    {
        // Simulate 90% success rate for demo purposes
        return rand(1, 100) <= 90;
    }

    /**
     * Check if event has available capacity.
     * 
     * This method checks if an event has remaining capacity
     * for additional bookings.
     * 
     * @param Event $event
     * @param int $requestedTickets
     * @return bool
     */
    public static function checkEventCapacity(Event $event, int $requestedTickets): bool
    {
        return $event->available_capacity >= $requestedTickets;
    }

    /**
     * Get booking statistics for an event.
     * 
     * This method returns comprehensive booking statistics
     * for reporting and analytics.
     * 
     * @param Event $event
     * @return array
     */
    public static function getEventBookingStats(Event $event): array
    {
        $bookings = $event->bookings();

        return [
            'total_bookings' => $bookings->count(),
            'pending_bookings' => $bookings->pending()->count(),
            'confirmed_bookings' => $bookings->confirmed()->count(),
            'cancelled_bookings' => $bookings->cancelled()->count(),
            'refunded_bookings' => $bookings->refunded()->count(),
            'total_tickets_sold' => $bookings->confirmed()->sum('total_tickets'),
            'total_revenue' => $bookings->confirmed()->sum('total_amount'),
            'average_booking_value' => $bookings->confirmed()->avg('total_amount'),
            'occupancy_rate' => $event->max_capacity > 0 
                ? ($event->total_tickets_sold / $event->max_capacity) * 100 
                : 0,
        ];
    }

    /**
     * Get user booking history.
     * 
     * This method returns a user's booking history
     * with relevant statistics.
     * 
     * @param int $userId
     * @return array
     */
    public static function getUserBookingHistory(int $userId): array
    {
        $bookings = Booking::where('user_id', $userId);

        return [
            'total_bookings' => $bookings->count(),
            'upcoming_bookings' => $bookings->whereHas('event', function ($query) {
                $query->upcoming();
            })->count(),
            'past_bookings' => $bookings->whereHas('event', function ($query) {
                $query->where('start_time', '<', now());
            })->count(),
            'cancelled_bookings' => $bookings->cancelled()->count(),
            'total_spent' => $bookings->confirmed()->sum('total_amount'),
            'favorite_categories' => self::getUserFavoriteCategories($userId),
        ];
    }

    /**
     * Get user's favorite event categories.
     * 
     * This method analyzes a user's booking history
     * to determine their preferred event categories.
     * 
     * @param int $userId
     * @return array
     */
    private static function getUserFavoriteCategories(int $userId): array
    {
        return \DB::table('bookings')
            ->join('events', 'bookings.event_id', '=', 'events.id')
            ->join('event_category_event', 'events.id', '=', 'event_category_event.event_id')
            ->join('event_categories', 'event_category_event.event_category_id', '=', 'event_categories.id')
            ->where('bookings.user_id', $userId)
            ->where('bookings.status', 'confirmed')
            ->select('event_categories.name', \DB::raw('count(*) as booking_count'))
            ->groupBy('event_categories.id', 'event_categories.name')
            ->orderBy('booking_count', 'desc')
            ->limit(5)
            ->get()
            ->toArray();
    }
}
