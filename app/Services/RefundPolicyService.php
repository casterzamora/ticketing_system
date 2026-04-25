<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\RefundRequest;
use App\Services\PayMongoService;
use Illuminate\Support\Facades\DB;

class RefundPolicyService
{
    /**
     * Evaluate if a manual customer refund request can be accepted.
     */
    public static function evaluateCustomerRequest(Booking $booking): array
    {
        if (!$booking->isConfirmed()) {
            return [
                'eligible' => false,
                'reason' => 'Only confirmed bookings can be refunded.',
            ];
        }

        $allowedStatus = (string) SystemSettingsService::get('refund_allowed_event_status', 'cancelled');
        if ($booking->event?->status !== $allowedStatus) {
            return [
                'eligible' => false,
                'reason' => 'Tickets are non-refundable unless event status matches policy requirement.',
            ];
        }

        if ((float) $booking->total_amount <= 0) {
            return [
                'eligible' => false,
                'reason' => 'This booking has no refundable payment amount.',
            ];
        }

        $requiresSuccessfulPayment = (bool) SystemSettingsService::get('refund_require_successful_payment', true);
        if ($requiresSuccessfulPayment && !$booking->successfulPayment()) {
            return [
                'eligible' => false,
                'reason' => 'No successful payment was found for this booking.',
            ];
        }

        return ['eligible' => true, 'reason' => null];
    }

    /**
     * Release ticket inventory for a booking.
     */
    public static function releaseInventoryForBooking(Booking $booking): void
    {
        $booking->loadMissing('bookingTickets.ticketType');

        foreach ($booking->bookingTickets as $bookingTicket) {
            $bookingTicket->ticketType?->decreaseSoldQuantity($bookingTicket->quantity);
        }
    }

    /**
     * Create or update a refund ledger record and mark booking as refunded.
     */
    public static function approveToLedger(
        Booking $booking,
        string $reason,
        ?int $approvedBy = null,
        string $refundMethod = 'original_source'
    ): RefundRequest {
        return DB::transaction(function () use ($booking, $reason, $approvedBy, $refundMethod) {
            $booking->refresh();

            $existing = RefundRequest::where('booking_id', $booking->id)->first();
            $alreadyApproved = $existing?->status === 'approved' && !is_null($existing?->processed_at);

            $refund = RefundRequest::updateOrCreate(
                ['booking_id' => $booking->id],
                [
                    'refund_amount' => $booking->total_amount,
                    'reason' => $reason,
                    'status' => 'approved',
                    'approved_by' => $approvedBy,
                    'approved_at' => now(),
                    'processed_at' => now(),
                    'refund_method' => $refundMethod,
                    'rejection_reason' => null,
                ]
            );

            if (!$alreadyApproved) {
                self::releaseInventoryForBooking($booking);
            }

            if (!$refund->refund_reference) {
                $originalPayment = $booking->successfulPayment();

                if (!$originalPayment) {
                    throw new \RuntimeException('Cannot create refund ledger entry without a successful payment.');
                }

                $refundPayment = $originalPayment->createRefund($refund->refund_amount, $refundMethod);
                if ($refundPayment) {
                    $payMongoApplicable = $originalPayment->gateway === 'PayMongo'
                        && $originalPayment->payment_method === 'paymongo_checkout'
                        && app(PayMongoService::class)->isConfigured();

                    if ($payMongoApplicable) {
                        $gatewayRefund = app(PayMongoService::class)->createRefund(
                            $originalPayment,
                            (float) $refund->refund_amount,
                            $reason
                        );

                        $gatewayStatus = (string) ($gatewayRefund['status'] ?? 'pending');
                        $refundPayment->gateway = 'PayMongo';
                        $refundPayment->payment_method = 'paymongo_refund';
                        $refundPayment->transaction_id = (string) ($gatewayRefund['refund_id'] ?? $refundPayment->transaction_id);
                        $refundPayment->gateway_transaction_id = (string) ($gatewayRefund['payment_id'] ?? $refundPayment->gateway_transaction_id);
                        $refundPayment->gateway_response = $gatewayRefund['raw'] ?? [];
                        $refundPayment->processor_response = [
                            'event_type' => 'refund.created',
                            'status' => $gatewayStatus,
                        ];

                        if (in_array($gatewayStatus, ['succeeded', 'successful', 'paid'], true)) {
                            $refundPayment->status = 'successful';
                            $refundPayment->processed_at = now();
                        } else {
                            $refundPayment->status = 'pending';
                            $refundPayment->processed_at = null;
                        }

                        $refundPayment->save();
                        $refund->refund_reference = (string) ($gatewayRefund['refund_id'] ?? $refundPayment->id);
                    } else {
                        $refundPayment->markAsSuccessful();
                        $refund->refund_reference = (string) $refundPayment->id;
                    }

                    $refund->save();
                }
            }

            if ($booking->status !== 'refunded') {
                $booking->status = 'refunded';
                $booking->save();
            }

            DomainNotificationService::refundRecorded($booking, (float) $refund->refund_amount);
            DomainNotificationService::notifyAdmins(
                'booking.refund_recorded',
                'Refund Recorded',
                "Refund recorded for booking {$booking->booking_reference}.",
                [
                    'booking_id' => $booking->id,
                    'booking_reference' => $booking->booking_reference,
                    'refund_amount' => (float) $refund->refund_amount,
                    'refund_request_id' => $refund->id,
                ]
            );
            ActivityLogService::logRefundRequest(
                'approved',
                $refund,
                "Refund ledger approved for booking {$booking->booking_reference}."
            );

            return $refund;
        });
    }
}