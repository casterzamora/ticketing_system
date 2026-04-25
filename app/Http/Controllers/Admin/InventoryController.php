<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Event;
use App\Models\TicketType;
use App\Services\SystemSettingsService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Booking::query()
            ->with([
                'event:id,title',
                'bookingTickets.ticketType:id,name',
                'tickets:id,booking_id,ticket_code,ticket_type_id',
                'payments:id,booking_id,status,amount',
            ])
            ->latest();

        $this->applyFilters($query, $request);

        $bookings = $query->paginate(20);

        $mapped = $bookings->getCollection()->map(function (Booking $booking) {
            $paymentStatus = $booking->payments->first()?->status;

            $orderStatus = match (true) {
                $booking->status === 'refunded' => 'refunded',
                $paymentStatus === 'successful' || $booking->status === 'confirmed' => 'paid',
                $paymentStatus === 'failed' => 'failed',
                default => 'pending',
            };

            return [
                'id' => $booking->id,
                'booking_reference' => $booking->booking_reference,
                'customer_name' => $booking->customer_name,
                'customer_email' => $booking->customer_email,
                'event' => $booking->event ? [
                    'id' => $booking->event->id,
                    'title' => $booking->event->title,
                ] : null,
                'total_tickets' => $booking->total_tickets,
                'total_amount' => (float) $booking->total_amount,
                'order_status' => $orderStatus,
                'booking_status' => $booking->status,
                'payment_status' => $paymentStatus,
                'ticket_types' => $booking->bookingTickets
                    ->map(fn ($bt) => $bt->ticketType?->name)
                    ->filter()
                    ->values(),
                'ticket_codes' => $booking->tickets
                    ->pluck('ticket_code')
                    ->values(),
                'created_at' => $booking->created_at?->toIso8601String(),
            ];
        });

        $bookings->setCollection($mapped);

        $summaryBase = Booking::query();
        $this->applyFilters($summaryBase, $request);

        $summary = [
            'total_orders' => (clone $summaryBase)->count(),
            'paid_orders' => (clone $summaryBase)->where(function ($q) {
                $q->where('status', 'confirmed')
                  ->orWhereHas('payments', fn ($pq) => $pq->where('status', 'successful'));
            })->count(),
            'refunded_orders' => (clone $summaryBase)->where('status', 'refunded')->count(),
            'pending_orders' => (clone $summaryBase)->where('status', 'pending')->count(),
            'paid_sales' => (float) (clone $summaryBase)->where(function ($q) {
                $q->where('status', 'confirmed')
                  ->orWhereHas('payments', fn ($pq) => $pq->where('status', 'successful'));
            })->sum('total_amount'),
        ];

        $eventBreakdownBase = Booking::query();
        $this->applyFilters($eventBreakdownBase, $request);

        $eventBreakdown = $eventBreakdownBase
            ->selectRaw('event_id, COUNT(*) as total_orders, SUM(total_amount) as gross_sales')
            ->groupBy('event_id')
            ->with('event:id,title')
            ->get()
            ->map(fn ($row) => [
                'event_id' => $row->event_id,
                'event_title' => $row->event?->title,
                'total_orders' => (int) $row->total_orders,
                'gross_sales' => (float) $row->gross_sales,
            ])
            ->values();

        $thresholdPct = SystemSettingsService::fixedLowStockThresholdPct();
        $lowStockAlerts = TicketType::query()
            ->with('event:id,title')
            ->where('quantity_available', '>', 0)
            ->get()
            ->map(function (TicketType $ticketType) {
                $sold = (int) $ticketType->quantity_sold;
                $available = (int) $ticketType->quantity_available;
                $soldPct = $available > 0 ? (int) floor(($sold / $available) * 100) : 0;

                return [
                    'ticket_type_id' => $ticketType->id,
                    'ticket_type_name' => $ticketType->name,
                    'event_title' => $ticketType->event?->title,
                    'sold' => $sold,
                    'capacity' => $available,
                    'sold_pct' => $soldPct,
                ];
            })
            ->filter(fn ($row) => $row['sold_pct'] >= $thresholdPct)
            ->sortByDesc('sold_pct')
            ->values();

        return response()->json([
            'data' => $bookings->items(),
            'summary' => $summary,
            'event_breakdown' => $eventBreakdown,
            'low_stock_threshold_pct' => $thresholdPct,
            'low_stock_alerts' => $lowStockAlerts,
            'filters' => [
                'events' => Event::query()->select(['id', 'title'])->orderBy('title')->get(),
                'ticket_types' => TicketType::query()->select(['id', 'name'])->orderBy('name')->get(),
            ],
            'pagination' => [
                'current_page' => $bookings->currentPage(),
                'last_page' => $bookings->lastPage(),
                'total' => $bookings->total(),
            ],
        ]);
    }

    private function applyFilters(Builder $query, Request $request): void
    {
        if ($request->filled('search')) {
            $search = $request->string('search')->toString();
            $query->where(function ($q) use ($search) {
                $q->where('booking_reference', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('event_id')) {
            $query->where('event_id', (int) $request->event_id);
        }

        if ($request->filled('ticket_type_id')) {
            $ticketTypeId = (int) $request->ticket_type_id;
            $query->whereHas('bookingTickets', fn ($q) => $q->where('ticket_type_id', $ticketTypeId));
        }

        if ($request->filled('status')) {
            $status = $request->string('status')->toString();

            if ($status === 'paid') {
                $query->where(function ($q) {
                    $q->where('status', 'confirmed')
                        ->orWhereHas('payments', fn ($pq) => $pq->where('status', 'successful'));
                });
            } elseif ($status === 'pending') {
                $query->where('status', 'pending');
            } elseif ($status === 'refunded') {
                $query->where('status', 'refunded');
            } elseif ($status === 'failed') {
                $query->whereHas('payments', fn ($pq) => $pq->where('status', 'failed'));
            }
        }
    }
}
