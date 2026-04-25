<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $latestPayment = $this->relationLoaded('payments')
            ? $this->payments->sortByDesc('created_at')->first()
            : null;

        return [
            'id'                   => $this->id,
            'booking_reference'    => $this->booking_reference,
            'status'               => $this->status,
            'customer_name'        => $this->customer_name,
            'customer_email'       => $this->customer_email,
            'customer_phone'       => $this->customer_phone,
            'total_tickets'        => $this->total_tickets,
            'total_amount'         => (float) $this->total_amount,
            'special_requirements' => $this->special_requirements,
            'void_type'            => $this->void_type,
            'void_reason'          => $this->void_reason,
            'reschedule_response'  => $this->reschedule_response,
            'expires_at'           => $this->expires_at?->toIso8601String(),
            'checked_in_at'        => $this->checked_in_at?->toIso8601String(),
            'created_at'           => $this->created_at?->toIso8601String(),
            'event'                => $this->whenLoaded('event', fn () => [
                'id'              => $this->event->id,
                'title'           => $this->event->title,
                'venue'           => $this->event->venue,
                'start_time'      => $this->event->start_time?->toIso8601String(),
                'original_start_time' => $this->event->original_start_time?->toIso8601String(),
                'rescheduled_at'  => $this->event->rescheduled_at?->toIso8601String(),
                'refund_deadline' => $this->event->refund_deadline?->toIso8601String(),
                'image_url'       => $this->event->image_url,
                'status'          => $this->event->status,
            ]),
            'user'                 => $this->whenLoaded('user', fn () => [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
            ]),
            'booking_tickets'      => $this->whenLoaded('bookingTickets', fn () =>
                $this->bookingTickets->map(fn ($bt) => [
                    'id'               => $bt->id,
                    'quantity'         => $bt->quantity,
                    'price_per_ticket' => (float) $bt->price_per_ticket,
                    'total_price'      => (float) $bt->total_price,
                    'ticket_type'      => $bt->ticketType ? [
                        'id'   => $bt->ticketType->id,
                        'name' => $bt->ticketType->name,
                    ] : null,
                ])
            ),
            'payment_summary'      => $this->whenLoaded('payments', function () use ($latestPayment) {
                if (!$latestPayment) {
                    return null;
                }

                return [
                    'id' => $latestPayment->id,
                    'status' => $latestPayment->status,
                    'amount' => (float) $latestPayment->amount,
                    'currency' => $latestPayment->currency,
                    'payment_method' => $latestPayment->payment_method,
                    'processed_at' => $latestPayment->processed_at?->toIso8601String(),
                    'created_at' => $latestPayment->created_at?->toIso8601String(),
                ];
            }),
            'payments'             => $this->whenLoaded('payments', fn () =>
                $this->payments->map(fn ($p) => [
                    'id'                => $p->id,
                    'amount'            => (float) $p->amount,
                    'currency'          => $p->currency,
                    'status'            => $p->status,
                    'payment_method'    => $p->payment_method,
                    'payment_reference' => $p->payment_reference,
                    'sender_notes'      => $p->sender_notes,
                    'proof_image_url'   => $p->proof_image_path ? Storage::url($p->proof_image_path) : null,
                    'created_at'        => $p->created_at?->toIso8601String(),
                ])
            ),
            'refund_request'       => $this->whenLoaded('refundRequest', fn () =>
                $this->refundRequest ? [
                    'id'     => $this->refundRequest->id,
                    'status' => $this->refundRequest->status,
                    'reason' => $this->refundRequest->reason,
                ] : null
            ),
            'tickets'              => $this->whenLoaded('tickets', fn () => $this->tickets->map(fn ($t) => [
                'id'               => $t->id,
                'ticket_code'      => $t->ticket_code,
                'checked_in_at'    => $t->checked_in_at?->toIso8601String(),
            ])),
        ];
    }
}
