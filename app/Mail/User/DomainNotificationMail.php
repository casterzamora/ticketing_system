<?php

namespace App\Mail\User;

use App\Models\Booking;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Carbon;

class DomainNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly ?string $recipientName,
        public readonly string $eventKey,
        public readonly string $title,
        public readonly ?string $body,
        public readonly ?int $bookingId,
        public readonly ?string $bookingReference,
        public readonly array $payload = []
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->title . ' | Live Tix'
        );
    }

    public function content(): Content
    {
        $eventMeta = $this->eventMeta();
        $details = $this->readableDetails();
        $actionUrl = $this->primaryActionUrl();

        return new Content(
            view: 'emails.notifications.domain-event',
            with: [
                'recipientName' => $this->recipientName,
                'eventKey' => $this->eventKey,
                'title' => $this->title,
                'body' => $this->body,
                'bookingReference' => $this->bookingReference,
                'details' => $details,
                'accentColor' => $eventMeta['accent'],
                'label' => $eventMeta['label'],
                'actionUrl' => $actionUrl,
                'actionText' => $this->ticketActionText(),
                'secondaryText' => $this->secondaryText(),
                'ticketAttached' => $this->includesVirtualTicket(),
            ]
        );
    }

    public function attachments(): array
    {
        if (!$this->includesVirtualTicket() || !$this->bookingReference) {
            return [];
        }

        try {
            $booking = Booking::with(['event', 'user', 'bookingTickets.ticketType', 'tickets.ticketType', 'payments'])
                ->where('booking_reference', $this->bookingReference)
                ->first();

            if (!$booking) {
                return [];
            }

            return [
                Attachment::fromData(
                    fn () => Pdf::loadView('pdf.ticket', ['booking' => $booking])
                        ->setPaper('a4', 'portrait')
                        ->setWarnings(false)
                        ->output(),
                    'Ticket-' . $this->bookingReference . '.pdf'
                )->withMime('application/pdf'),
            ];
        } catch (\Throwable $e) {
            Log::warning('Ticket PDF attachment generation failed.', [
                'event_key' => $this->eventKey,
                'booking_reference' => $this->bookingReference,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    private function includesVirtualTicket(): bool
    {
        return in_array($this->eventKey, ['booking.paid', 'reschedule.accepted'], true);
    }

    private function ticketActionText(): string
    {
        if ($this->eventKey === 'booking.payment_failed') {
            return 'Retry Payment';
        }

        if ($this->eventKey === 'booking.refund_recorded') {
            return 'View Refund Status';
        }

        if ($this->eventKey === 'event.rescheduled') {
            return 'Review Schedule Update';
        }

        if ($this->eventKey === 'reschedule.accepted') {
            return 'Open Updated Ticket PDF';
        }

        if ($this->eventKey === 'booking.paid') {
            return 'Open Ticket PDF';
        }

        return 'Open Live Tix';
    }

    private function primaryActionUrl(): ?string
    {
        if ($this->bookingId) {
            if ($this->eventKey === 'booking.payment_failed') {
                return url('/user/checkout/' . $this->bookingId);
            }

            return url('/user/bookings/' . $this->bookingId);
        }

        if ($this->bookingReference) {
            return url('/tickets/' . $this->bookingReference . '/pdf');
        }

        return url('/events');
    }

    private function secondaryText(): string
    {
        return match ($this->eventKey) {
            'booking.paid' => 'Keep this email for your records. Your ticket PDF is attached.',
            'booking.payment_failed' => 'Your reservation remains pending until a successful payment is completed.',
            'booking.refund_recorded' => 'Refund settlement timelines depend on your payment channel and provider processing.',
            'event.rescheduled' => 'Please confirm your decision before the deadline shown below.',
            default => 'You can review full details in your Live Tix dashboard.',
        };
    }

    private function eventMeta(): array
    {
        return match ($this->eventKey) {
            'booking.paid' => ['label' => 'Payment Update', 'accent' => '#16a34a'],
            'reschedule.accepted' => ['label' => 'Updated Ticket', 'accent' => '#059669'],
            'booking.payment_failed' => ['label' => 'Payment Update', 'accent' => '#dc2626'],
            'event.rescheduled' => ['label' => 'Schedule Update', 'accent' => '#f59e0b'],
            'event.cancelled' => ['label' => 'Event Update', 'accent' => '#b91c1c'],
            'auth.registered' => ['label' => 'Welcome', 'accent' => '#2563eb'],
            default => ['label' => 'Account Notification', 'accent' => '#4f46e5'],
        };
    }

    private function readableDetails(): array
    {
        $result = [];
        $labelMap = [
            'booking_reference' => 'Booking Reference',
            'event_title' => 'Event',
            'event_type' => 'Payment Event',
            'customer_name' => 'Customer Name',
            'customer_email' => 'Customer Email',
            'status' => 'Status',
            'amount' => 'Amount',
            'total_amount_php' => 'Total Amount',
            'refund_amount' => 'Refund Amount',
            'old_schedule' => 'Original Schedule',
            'new_schedule' => 'New Schedule',
            'decision_deadline' => 'Decision Deadline',
            'checked_in_at' => 'Check-In Time',
            'policy_default_if_no_response' => 'If No Decision Is Submitted',
        ];

        foreach ($this->payload as $key => $value) {
            if (!is_scalar($value) || $value === null) {
                continue;
            }

            $rawKey = (string) $key;
            $label = $labelMap[$rawKey] ?? ucwords(str_replace('_', ' ', $rawKey));
            $result[$label] = $this->formatDetailValue($rawKey, (string) $value);
        }

        return $result;
    }

    private function formatDetailValue(string $key, string $value): string
    {
        if (in_array($key, ['amount', 'refund_amount'], true) && is_numeric($value)) {
            return 'PHP ' . number_format((float) $value, 2);
        }

        if ($key === 'total_amount_php' && is_numeric(str_replace(',', '', $value))) {
            return 'PHP ' . number_format((float) str_replace(',', '', $value), 2);
        }

        if (in_array($key, ['old_schedule', 'new_schedule', 'decision_deadline', 'checked_in_at'], true)) {
            try {
                return Carbon::parse($value)->format('M d, Y h:i A');
            } catch (\Throwable $e) {
                return $value;
            }
        }

        return $value;
    }
}
