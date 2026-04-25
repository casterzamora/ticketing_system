<?php

namespace App\Http\Resources;

use App\Services\SystemSettingsService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $remainingTotal = $this->activeTicketTypes->sum(fn($t) => $t->quantity_available - $t->quantity_sold);
        $soldTotal = max(0, (int) $this->max_capacity - (int) $remainingTotal);
        $soldPct = (int) ($this->max_capacity > 0 ? floor(($soldTotal / (int) $this->max_capacity) * 100) : 0);
        $lowStockThreshold = SystemSettingsService::fixedLowStockThresholdPct();

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
            'original_start_time' => $this->original_start_time?->toIso8601String(),
            'rescheduled_at' => $this->rescheduled_at?->toIso8601String(),
            'refund_deadline' => $this->refund_deadline?->toIso8601String(),
            'is_featured'   => (bool) $this->is_featured,
            'is_active'     => (bool) $this->is_active,
            'image_url'     => $this->image_url,
            'video_url'     => $this->video_url,
            'remaining_total' => $remainingTotal,
            'sold_pct' => $soldPct,
            'low_stock_threshold_pct' => $lowStockThreshold,
            'low_stock_alert' => $soldPct >= $lowStockThreshold,
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
