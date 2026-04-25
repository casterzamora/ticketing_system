<?php

namespace App\Services;

use App\Mail\User\DomainNotificationMail;
use App\Models\Booking;
use App\Models\NotificationLog;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class DomainNotificationService
{
    public static function forUser(
        ?int $userId,
        string $eventKey,
        string $title,
        ?string $body = null,
        ?Booking $booking = null,
        array $payload = []
    ): ?NotificationLog {
        if (!$userId) {
            return null;
        }

        $user = User::query()->find($userId);
        if (!$user) {
            return null;
        }

        $notification = NotificationLog::create([
            'user_id' => $userId,
                'booking_id' => $booking?->id,
            'event_key' => $eventKey,
            'channel' => 'in_app',
            'title' => $title,
            'body' => $body,
            'payload' => $payload,
            'sent_at' => now(),
        ]);

        self::sendEmailNotification($user, $eventKey, $title, $body, $booking, $payload);

        return $notification;
    }

    public static function bookingPaid(Booking $booking): ?NotificationLog
    {
        $notification = self::forUser(
            $booking->user_id,
            'booking.paid',
            'Payment Confirmed',
            'Your payment was confirmed and your tickets are now active.',
            $booking,
            [
                'booking_reference' => $booking->booking_reference,
                'status' => $booking->status,
                'event_title' => $booking->event?->title,
                    'new_schedule' => $booking->event?->start_time?->toDateTimeString(),
                    'amount' => $booking->total_amount,
                'customer_name' => $booking->customer_name,
                'customer_email' => $booking->customer_email,
            ]
        );

        self::sendBookingPaidCopyToAdmins($booking);

        return $notification;
    }

    public static function bookingPaymentFailed(Booking $booking, string $eventType): ?NotificationLog
    {
        return self::forUser(
            $booking->user_id,
            'booking.payment_failed',
            'Payment Failed',
            'We could not confirm your payment. You can try again from checkout.',
            $booking,
            [
                'booking_reference' => $booking->booking_reference,
                'event_type' => $eventType,
                    'amount' => $booking->total_amount,
            ]
        );
    }

    public static function refundRecorded(Booking $booking, float $amount): ?NotificationLog
    {
        return self::forUser(
            $booking->user_id,
            'booking.refund_recorded',
            'Refund Recorded',
            'Your refund has been approved and initiated. Settlement time depends on your bank or wallet provider.',
            $booking,
            [
                'booking_reference' => $booking->booking_reference,
                    'event_title' => $booking->event?->title,
                    'new_schedule' => $booking->event?->start_time?->toDateTimeString(),
                    'refund_amount' => $amount,
            ]
        );
    }

    public static function eventRescheduled(Booking $booking, array $policyDetails = []): ?NotificationLog
    {
        $booking->loadMissing('event');

        $payload = array_merge([
            'booking_reference' => $booking->booking_reference,
            'event_id' => $booking->event_id,
            'old_schedule' => $booking->event?->original_start_time?->toDateTimeString(),
            'new_schedule' => $booking->event?->start_time?->toDateTimeString(),
            'decision_deadline' => $booking->event?->refund_deadline?->toDateTimeString(),
            'policy_default_if_no_response' => 'Ticket remains valid for the new schedule.',
                'event_title' => $booking->event?->title,
        ], $policyDetails);

        return self::forUser(
            $booking->user_id,
            'event.rescheduled',
            'Event Rescheduled',
            'Your event schedule has changed. Please choose Keep Ticket or Request Refund before the decision deadline.',
            $booking,
            $payload
        );
    }

    public static function rescheduleAccepted(Booking $booking): ?NotificationLog
    {
        $notification = self::forUser(
            $booking->user_id,
            'reschedule.accepted',
            'Reschedule Confirmed',
            'Your updated virtual ticket is attached for the new event schedule.',
            $booking,
            [
                'booking_reference' => $booking->booking_reference,
                'event_title' => $booking->event?->title,
                'new_schedule' => $booking->event?->start_time?->toDateTimeString(),
                'decision' => 'accepted',
            ]
        );

        self::sendRescheduleAcceptedCopyToAdmins($booking);

        return $notification;
    }

    public static function eventCancelled(Booking $booking): ?NotificationLog
    {
        return self::forUser(
            $booking->user_id,
            'event.cancelled',
            'Event Cancelled',
            'The event was cancelled. Any eligible refund has been recorded automatically.',
            $booking,
            [
                'booking_reference' => $booking->booking_reference,
                'event_id' => $booking->event_id,
            ]
        );
    }

    public static function scannerCheckIn(Booking $booking): ?NotificationLog
    {
        return self::forUser(
            $booking->user_id,
            'booking.checked_in',
            'Check-In Recorded',
            'Your ticket was successfully checked in at the venue gate.',
            $booking,
            [
                'booking_reference' => $booking->booking_reference,
                'checked_in_at' => $booking->checked_in_at?->toIso8601String(),
            ]
        );
    }

    public static function notifyAdmins(string $eventKey, string $title, string $body, array $payload = []): void
    {
        User::query()->role('admin')->pluck('id')->each(function ($adminId) use ($eventKey, $title, $body, $payload) {
            self::forUser((int) $adminId, $eventKey, $title, $body, null, $payload);
        });
    }

    private static function sendEmailNotification(
        User $user,
        string $eventKey,
        string $title,
        ?string $body,
        ?Booking $booking,
        array $payload
    ): void {
        if (app()->environment('testing')) {
            return;
        }

        if (!$user->email) {
            return;
        }

        try {
            $mail = new DomainNotificationMail(
                recipientName: $user->name,
                eventKey: $eventKey,
                title: $title,
                body: $body,
                bookingId: $booking?->id,
                bookingReference: $booking?->booking_reference,
                payload: $payload
            );

            $mailer = Mail::to($user->email);
            if ((bool) env('NOTIFICATION_MAIL_QUEUE', false)) {
                $mailer->queue($mail);
            } else {
                $mailer->send($mail);
            }

            NotificationLog::create([
                'user_id' => $user->id,
                'booking_id' => $booking?->id,
                'event_key' => $eventKey,
                'channel' => 'email',
                'title' => $title,
                'body' => $body,
                'payload' => array_merge($payload, ['status' => 'sent', 'recipient' => $user->email]),
                'sent_at' => now(),
            ]);
        } catch (\Throwable $e) {
            NotificationLog::create([
                'user_id' => $user->id,
                'booking_id' => $booking?->id,
                'event_key' => $eventKey,
                'channel' => 'email_failed',
                'title' => $title,
                'body' => $body,
                'payload' => array_merge($payload, ['status' => 'failed', 'recipient' => $user->email, 'error' => $e->getMessage()]),
                'sent_at' => now(),
            ]);

            Log::warning('Notification email send failed.', [
                'user_id' => $user->id,
                'event_key' => $eventKey,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private static function sendBookingPaidCopyToAdmins(Booking $booking): void
    {
        User::query()
            ->role('admin')
            ->whereNotNull('email')
            ->where('id', '!=', (int) $booking->user_id)
            ->pluck('id')
            ->each(function ($adminId) use ($booking) {
                self::forUser(
                    (int) $adminId,
                    'booking.paid',
                    'Payment Confirmed (Admin Copy)',
                    "Customer {$booking->customer_name} completed payment. Ticket copy attached.",
                    $booking,
                    [
                        'booking_reference' => $booking->booking_reference,
                        'event_title' => $booking->event?->title,
                        'customer_name' => $booking->customer_name,
                        'customer_email' => $booking->customer_email,
                        'total_amount_php' => number_format((float) $booking->total_amount, 2),
                    ]
                );
            });
    }

    private static function sendRescheduleAcceptedCopyToAdmins(Booking $booking): void
    {
        User::query()
            ->role('admin')
            ->whereNotNull('email')
            ->where('id', '!=', (int) $booking->user_id)
            ->pluck('id')
            ->each(function ($adminId) use ($booking) {
                self::forUser(
                    (int) $adminId,
                    'reschedule.accepted',
                    'Reschedule Confirmed (Admin Copy)',
                    "Customer {$booking->customer_name} accepted the new schedule. Updated virtual ticket attached.",
                    $booking,
                    [
                        'booking_reference' => $booking->booking_reference,
                        'event_title' => $booking->event?->title,
                        'customer_name' => $booking->customer_name,
                        'customer_email' => $booking->customer_email,
                        'new_schedule' => $booking->event?->start_time?->toDateTimeString(),
                    ]
                );
            });
    }
}
