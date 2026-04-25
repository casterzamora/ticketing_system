<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Event;
use App\Models\RefundRequest;
use Illuminate\Http\Request;

class OperationsReportController extends Controller
{
    public function index(Request $request)
    {
        $days = max(7, min((int) $request->get('days', 14), 90));

        $dailyRevenue = Booking::query()
            ->selectRaw('DATE(created_at) as day, SUM(total_amount) as amount')
            ->whereHas('payments', fn ($q) => $q->where('status', 'successful'))
            ->where('created_at', '>=', now()->subDays($days))
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($row) => [
                'day' => $row->day,
                'amount' => (float) $row->amount,
            ])
            ->values();

        $topEvents = Event::query()
            ->withCount('bookings')
            ->withSum('bookings as gross_sales', 'total_amount')
            ->orderByDesc('gross_sales')
            ->limit(5)
            ->get()
            ->map(fn ($event) => [
                'id' => $event->id,
                'title' => $event->title,
                'bookings_count' => (int) $event->bookings_count,
                'gross_sales' => (float) ($event->gross_sales ?? 0),
            ])
            ->values();

        $refundReasons = RefundRequest::query()
            ->selectRaw('reason, COUNT(*) as count, SUM(refund_amount) as total')
            ->groupBy('reason')
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'reason' => (string) $row->reason,
                'count' => (int) $row->count,
                'total' => (float) $row->total,
            ])
            ->values();

        return response()->json([
            'window_days' => $days,
            'kpis' => [
                'total_bookings' => Booking::count(),
                'confirmed_bookings' => Booking::where('status', 'confirmed')->count(),
                'refunded_bookings' => Booking::where('status', 'refunded')->count(),
                'refund_ledger_count' => RefundRequest::count(),
                'gross_revenue' => (float) Booking::whereHas('payments', fn ($q) => $q->where('status', 'successful'))->sum('total_amount'),
                'refunded_amount' => (float) RefundRequest::where('status', 'approved')->sum('refund_amount'),
            ],
            'daily_revenue' => $dailyRevenue,
            'top_events' => $topEvents,
            'refund_reasons' => $refundReasons,
        ]);
    }
}
