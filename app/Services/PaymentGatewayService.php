<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use App\Models\TicketType;
use App\Models\ActivityLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PaymentGatewayService
{
    /**
     * Create a Checkout Session with simulation support.
     */
    public function createSession(Booking $booking, string $method)
    {
        return DB::transaction(function () use ($booking, $method) {
            $sessionId = 'SES_' . Str::upper(Str::random(12));
            $booking->update(['external_session_id' => $sessionId]);

            // Create placeholder payment
            $payment = Payment::updateOrCreate(
                ['booking_id' => $booking->id],
                [
                    'amount' => $booking->total_amount,
                    'status' => 'pending',
                    'payment_method' => $method,
                    'gateway' => 'InternalSandbox',
                    'transaction_id' => $sessionId,
                    'currency' => 'PHP'
                ]
            );

            // Generate "Gateway URL" (Simulation link)
            $checkoutUrl = "/payment/checkout/{$sessionId}";

            return [
                'session_id' => $sessionId,
                'checkout_url' => $checkoutUrl,
                'payment_id' => $payment->id
            ];
        });
    }

    /**
     * Simulate Webhook coming from Gateway
     */
    public function handleWebhook(string $sessionId, bool $success = true, array $meta = [])
    {
        return DB::transaction(function () use ($sessionId, $success, $meta) {
            $booking = Booking::where('external_session_id', $sessionId)->firstOrFail();
            $payment = Payment::where('booking_id', $booking->id)->first();

            if ($success) {
                $payment->update([
                    'status' => 'successful',
                    'meta_data' => $meta,
                    'processed_at' => now(),
                    'webhook_event_id' => 'EVT_' . Str::random(8)
                ]);

                // CONFIRM BOOKING & APPLY PAID_AT
                $booking->update([
                    'status' => 'confirmed',
                    'paid_at' => now()
                ]);

                // TRIGGER IDEMPOTENT TICKET GENERATION (ID: 15)
                BookingService::generatePaidTickets($booking);

                ActivityLogService::logPayment('Payment Successful', $payment, 'Real-time payment successful via ' . $payment->payment_method);
                DomainNotificationService::bookingPaid($booking);
            } else {
                $payment->update(['status' => 'failed', 'meta_data' => $meta]);
                $booking->update(['status' => 'cancelled']);
                DomainNotificationService::bookingPaymentFailed($booking, 'sandbox.failed');
                
                // RELEASE INVENTORY
                foreach ($booking->bookingTickets as $bt) {
                    $bt->ticketType->decrement('quantity_sold', $bt->quantity);
                }
            }

            return $booking;
        });
    }
}
