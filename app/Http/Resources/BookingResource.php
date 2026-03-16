<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
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
            'created_at'           => $this->created_at?->toIso8601String(),
            'event'                => $this->whenLoaded('event', fn () => [
                'id'         => $this->event->id,
                'title'      => $this->event->title,
                'venue'      => $this->event->venue,
                'start_time' => $this->event->start_time?->toIso8601String(),
                'image_url'  => $this->event->image_url,
                'status'     => $this->event->status,
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
            'payments'             => $this->whenLoaded('payments', fn () =>
                $this->payments->map(fn ($p) => [
                    'id'             => $p->id,
                    'amount'         => (float) $p->amount,
                    'currency'       => $p->currency,
                    'status'         => $p->status,
                    'payment_method' => $p->payment_method,
                    'created_at'     => $p->created_at?->toIso8601String(),
                ])
            ),
            'refund_request'       => $this->whenLoaded('refundRequest', fn () =>
                $this->refundRequest ? [
                    'id'     => $this->refundRequest->id,
                    'status' => $this->refundRequest->status,
                    'reason' => $this->refundRequest->reason,
                ] : null
            ),
        ];
    }
}
