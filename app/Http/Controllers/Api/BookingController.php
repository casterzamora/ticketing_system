<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use App\Services\DomainNotificationService;
use App\Services\PayMongoService;
use App\Services\PaymentGatewayService;
use App\Services\RefundPolicyService;
use App\Services\SystemSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;

class BookingController extends Controller
{
    public function paymentHealth(PayMongoService $payMongoService)
    {
        $mode = (string) SystemSettingsService::get('payment_provider_mode', 'sandbox');

        return response()->json([
            'mode' => $mode,
            'sandbox_ready' => true,
            'paymongo_configured' => $payMongoService->isConfigured(),
            'ready' => $mode === 'sandbox' || $payMongoService->isConfigured(),
        ]);
    }

    /**
     * Download ticket as PDF.
     */
    public function downloadTicketPdf($reference)
    {
        $booking = Booking::with(['event', 'user', 'bookingTickets.ticketType', 'tickets.ticketType', 'payments'])
            ->where('booking_reference', $reference)
            ->firstOrFail();

        // Optional: Check if the booking is confirmed or if current user owns it
        // For simplicity in scanning, we'll let anyone with the URL see the ticket,
        // but normally we would want some layer of verification or a signed URL.

        $pdf = Pdf::loadView('pdf.ticket', compact('booking'))
            ->setPaper('a4', 'portrait')
            ->setWarnings(false);
        
        return $pdf->stream("Ticket-{$reference}.pdf");
    }

    /**
     * Get user's bookings.
     */
    public function index(PayMongoService $payMongoService)
    {
        $bookings = Auth::user()->bookings()
            ->with(['event', 'bookingTickets.ticketType', 'refundRequest', 'payments', 'tickets'])
            ->latest()
            ->get();

        $mode = (string) SystemSettingsService::get('payment_provider_mode', 'sandbox');
        if ($mode === 'paymongo' && $payMongoService->isConfigured()) {
            foreach ($bookings as $booking) {
                if ($booking->status !== 'pending' || empty($booking->external_session_id)) {
                    continue;
                }

                try {
                    $payMongoService->syncCheckoutStatus($booking);
                    $booking->refresh();
                } catch (\Throwable $e) {
                    Log::warning('PayMongo reconciliation on booking index failed.', [
                        'booking_id' => $booking->id,
                        'message' => $e->getMessage(),
                    ]);
                }
            }
        }

        return BookingResource::collection($bookings);
    }

    /**
     * Get single booking details.
     */
    public function show(Booking $booking, PayMongoService $payMongoService)
    {
        // Check if user owns this booking
        if (Auth::id() !== $booking->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        if ($booking->status === 'pending' && !empty($booking->external_session_id)) {
            $mode = (string) SystemSettingsService::get('payment_provider_mode', 'sandbox');

            if ($mode === 'paymongo' && $payMongoService->isConfigured()) {
                try {
                    $payMongoService->syncCheckoutStatus($booking);
                    $booking->refresh();
                } catch (\Throwable $e) {
                    Log::warning('PayMongo reconciliation on booking show failed.', [
                        'booking_id' => $booking->id,
                        'message' => $e->getMessage(),
                    ]);
                }
            }
        }

        $booking->load(['event', 'bookingTickets.ticketType', 'refundRequest', 'payments', 'tickets']);
        return new BookingResource($booking);
    }

    /**
     * Create new booking.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|exists:events,id',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'special_requirements' => 'nullable|string|max:1000',
            'tickets' => 'required|array|min:1',
            'tickets.*' => 'required|integer|min:1|max:10',
        ]);

        // Check if user already has booking for this event
        $existingBooking = Booking::where('user_id', Auth::id())
            ->where('event_id', $validated['event_id'])
            ->first();

        if ($existingBooking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking already exists.'
            ], 422);
        }

        // Calculate total amount
        $totalAmount = 0;
        foreach ($validated['tickets'] as $ticketTypeId => $quantity) {
            if ($quantity > 0) {
                $ticketType = \App\Models\TicketType::findOrFail($ticketTypeId);
                $totalAmount += $ticketType->price * $quantity;
            }
        }

        // Prepare booking data
        $bookingData = array_merge($validated, [
            'user_id' => Auth::id(),
            'booking_reference' => 'BK-' . date('Y') . '-' . strtoupper(substr(uniqid(), -5)),
            'total_tickets' => array_sum($validated['tickets']),
            'total_amount' => $totalAmount,
            'status' => 'pending',
        ]);

        $booking = BookingService::createBooking($bookingData);

        if ($booking) {
            return response()->json([
                'success' => true,
                'message' => 'Booking created.',
                'data' => new BookingResource($booking)
            ], 201);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Creation failed.'
            ], 500);
        }
    }

    /**
     * Cancel booking.
     */
    public function cancel(Booking $booking)
    {
        // Check if user owns this booking
        if (Auth::id() !== $booking->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $success = BookingService::cancelBooking($booking);

        if ($success) {
            return response()->json([
                'success' => true,
                'message' => 'Booking cancelled.',
                'data' => new BookingResource($booking)
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel.'
            ], 422);
        }
    }

    /**
     * Respond to a reschedule notification.
     */
    public function respondToReschedule(Booking $booking, Request $request)
    {
        $request->validate([
            'response' => 'required|in:accepted,refund_requested',
        ]);

        // Check if user owns this booking
        if (Auth::id() !== $booking->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        // Verify event is actually rescheduled and window is open
        $event = $booking->event;
        if ($event->status !== 'rescheduled' || !$event->refund_deadline || $event->refund_deadline->isPast()) {
            return response()->json([
                'success' => false,
                'message' => 'The decision period for this event has closed or it is not in a rescheduled state.'
            ], 422);
        }

        if ($booking->reschedule_response !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'You have already responded to this rescheduling.'
            ], 422);
        }

        try {
            DB::beginTransaction();

            if ($request->response === 'accepted') {
                $booking->update([
                    'reschedule_response' => 'accepted',
                    'responded_at' => now(),
                ]);
                $booking->load('event');
                DomainNotificationService::rescheduleAccepted($booking);
                $message = 'Thank you for confirming your attendance for the new date!';
            } else {
                $booking->update([
                    'reschedule_response' => 'refund_requested',
                    'responded_at' => now(),
                ]);

                RefundPolicyService::approveToLedger(
                    $booking,
                    'CUSTOMER REJECTION: Event rescheduled by Organizer',
                    null,
                    'original_source'
                );

                $message = 'We are sorry you cannot make it. Your refund has been automatically approved.';
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => $message,
                'data' => new BookingResource($booking->fresh())
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error processing your response: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Request refund for booking.
     */
    public function requestRefund(Booking $booking, Request $request)
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:10|max:1000',
        ]);

        // Check if user owns this booking
        if (Auth::id() !== $booking->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        if ($booking->refundRequest) {
            return response()->json([
                'success' => true,
                'message' => 'Refund has already been processed for this booking.',
                'data' => $booking->refundRequest
            ]);
        }

        $policy = RefundPolicyService::evaluateCustomerRequest($booking);
        if (!$policy['eligible']) {
            return response()->json([
                'success' => false,
                'message' => $policy['reason']
            ], 422);
        }

        $refundRequest = RefundPolicyService::approveToLedger(
            $booking,
            $validated['reason'],
            null,
            'original_source'
        );

        if ($refundRequest) {
            return response()->json([
                'success' => true,
                'message' => 'Refund has been approved by policy and recorded in the ledger.',
                'data' => $refundRequest
            ], 201);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Cannot request refund for this booking'
            ], 422);
        }
    }

    /**
     * Create a simulated payment intent before webhook confirmation.
     */
    public function simulateIntent(Booking $booking, Request $request, PaymentGatewayService $paymentService)
    {
        if (config('app.env') === 'production') {
            abort(404);
        }

        if (Auth::id() !== $booking->user_id || $booking->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Invalid state for payment intent.'
            ], 422);
        }

        $validated = $request->validate([
            'payment_method' => 'required|in:qr,online,bank',
            'sender_name' => 'required|string|max:255',
            'sender_account' => 'required|string|max:100',
            'payment_reference' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0.01',
        ]);

        if (abs((float) $validated['amount'] - (float) $booking->total_amount) > 0.009) {
            return response()->json([
                'success' => false,
                'message' => 'Transferred amount must match the exact booking total.'
            ], 422);
        }

        $methodLabel = match ($validated['payment_method']) {
            'qr' => 'GCash QR',
            'online' => 'Online Bank',
            default => 'Manual Bank Transfer',
        };

        if (!$booking->external_session_id) {
            $paymentService->createSession($booking, $methodLabel);
            $booking->refresh();
        }

        $payment = \App\Models\Payment::updateOrCreate(
            ['booking_id' => $booking->id, 'status' => 'pending'],
            [
                'amount' => $booking->total_amount,
                'payment_method' => $methodLabel,
                'payment_reference' => $validated['payment_reference'],
                'sender_notes' => 'Sender: ' . $validated['sender_name'] . ' | Account: ' . $validated['sender_account'],
                'transaction_id' => $booking->external_session_id,
                'gateway' => 'BankTransferGateway',
                'currency' => 'PHP',
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'Transfer details submitted. Waiting for bank confirmation.',
            'data' => [
                'payment_id' => $payment->id,
                'session_id' => $booking->external_session_id,
                'eta_seconds' => random_int(15, 35),
            ]
        ]);
    }

    /**
     * Create PayMongo checkout session for a pending booking.
     */
    public function createPayMongoCheckout(Booking $booking, PayMongoService $payMongoService)
    {
        if (Auth::id() !== $booking->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        if ($booking->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Booking is no longer payable.'
            ], 422);
        }

        if ($booking->expires_at && $booking->expires_at->lte(now())) {
            return response()->json([
                'success' => false,
                'message' => 'Checkout window has expired for this booking.',
            ], 422);
        }

        $mode = (string) SystemSettingsService::get('payment_provider_mode', 'sandbox');
        if ($mode !== 'paymongo') {
            return response()->json([
                'success' => false,
                'message' => 'Primary gateway checkout is currently unavailable. Please use the available checkout channel.',
            ], 422);
        }

        if (!$payMongoService->isConfigured()) {
            return response()->json([
                'success' => false,
                'message' => 'PayMongo is not configured yet. Keep using simulation for now.'
            ], 503);
        }

        try {
            $result = $payMongoService->createCheckoutSession($booking);

            return response()->json([
                'success' => true,
                'message' => 'PayMongo checkout session created.',
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create PayMongo checkout session: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Handle PayMongo webhook notifications.
     */
    public function handlePayMongoWebhook(Request $request, PayMongoService $payMongoService)
    {
        try {
            $result = $payMongoService->handleWebhook(
                $request->all(),
                $request->header('Paymongo-Signature')
            );

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Webhook processing failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Simulate automated payment success in non-production.
     */
    public function simulateSuccess(Booking $booking, PaymentGatewayService $paymentService)
    {
        if (config('app.env') === 'production') {
            abort(404);
        }

        if (Auth::id() !== $booking->user_id || $booking->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Invalid state for simulation.'
            ], 422);
        }

        // 1. Ensure a session exists
        if (!$booking->external_session_id) {
            $paymentService->createSession($booking, 'Gcash (Simulated)');
        }

        // 2. Trigger webhook simulation
        try {
            $paymentService->handleWebhook($booking->external_session_id, true, [
                'simulated' => true,
                'user_agent' => request()->userAgent()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Simulated payment successful! Check your tickets.',
                'data' => new BookingResource($booking->fresh(['bookingTickets', 'event', 'payments']))
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Simulation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit payment proof for a booking.
     */
    public function submitPaymentProof(Booking $booking, Request $request)
    {
        // Check if user owns this booking
        if (Auth::id() !== $booking->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        // Validate request
        $validated = $request->validate([
            'proof_image' => 'required|image|max:2048',
            'payment_reference' => 'required|string|max:100',
            'sender_notes' => 'nullable|string|max:1000',
        ]);

        try {
            DB::beginTransaction();

            // Store the image in public/payments
            $image = $request->file('proof_image');
            $filename = 'proof_' . $booking->id . '_' . time() . '.' . $image->getClientOriginalExtension();
            $image->move(public_path('payments'), $filename);
            $imagePath = 'payments/' . $filename;

            // Create or update status for the booking's payment record
            $payment = \App\Models\Payment::updateOrCreate(
                ['booking_id' => $booking->id, 'status' => 'pending'],
                [
                    'amount' => $booking->total_amount,
                    'payment_method' => 'manual_transfer',
                    'proof_image_path' => $imagePath,
                    'payment_reference' => $validated['payment_reference'],
                    'sender_notes' => $validated['sender_notes'],
                ]
            );

            // Update booking status if needed
            if ($booking->status === 'pending') {
                $booking->update(['status' => 'awaiting_confirmation']);
            }

            // Log activity
            \App\Services\ActivityLogService::logPayment('proof_submitted', $payment, "Payment proof submitted for booking #{$booking->booking_reference}");

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Payment proof uploaded successfully. Your booking is now awaiting confirmation.',
                'data' => [
                    'payment_id' => $payment->id,
                    'status' => $payment->status,
                    'proof_image' => asset($imagePath)
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload payment proof: ' . $e->getMessage()
            ], 500);
        }
    }
}
