<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'title'         => $this->title,
            'description'   => $this->description,
            'venue'         => $this->venue,
            'address'       => $this->address,
            'start_time'    => $this->start_time?->toIso8601String(),
            'end_time'      => $this->end_time?->toIso8601String(),
            'timezone'      => $this->timezone,
            'max_capacity'  => $this->max_capacity,
            'base_price'    => (float) $this->base_price,
            'status'        => $this->status,
            'is_featured'   => (bool) $this->is_featured,
            'is_active'     => (bool) $this->is_active,
            'image_url'     => $this->image_url,
            'created_by'    => $this->created_by,
            'created_at'    => $this->created_at?->toIso8601String(),
            'categories'    => $this->whenLoaded('categories', fn () =>
                $this->categories->map(fn ($c) => [
                    'id'   => $c->id,
                    'name' => $c->name,
                    'slug' => $c->slug,
                ])
            ),
            'ticket_types'  => $this->whenLoaded('activeTicketTypes', fn () =>
                $this->activeTicketTypes->map(fn ($t) => [
                    'id'                 => $t->id,
                    'name'               => $t->name,
                    'description'        => $t->description,
                    'price'              => (float) $t->price,
                    'quantity_available' => $t->quantity_available,
                    'quantity_sold'      => $t->quantity_sold,
                    'remaining'          => $t->quantity_available - $t->quantity_sold,
                    'is_active'          => (bool) $t->is_active,
                ])
            ),
            'tickets_sold'  => $this->whenHas('tickets_sold'),
            'revenue'       => $this->whenHas('revenue'),
        ];
    }
}
