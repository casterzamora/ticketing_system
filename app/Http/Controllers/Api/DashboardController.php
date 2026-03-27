<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics for React frontend.
     */
    public function stats()
    {
        $user = Auth::user();
        
        if ($user->isAdmin()) {
            // Admin statistics
            $grossRevenue = Booking::where('status', 'confirmed')->sum('total_amount');
            $refundedAmount = \App\Models\RefundRequest::where('status', 'approved')->sum('refund_amount');
            $netRevenue = $grossRevenue - $refundedAmount;
            
            $ticketsSold = \App\Models\BookingTicket::whereHas('booking', fn($q) => $q->where('status', 'confirmed'))->count();
            
            $recentBookings = Booking::with(['user', 'event'])
                ->latest()
                ->take(5)
                ->get()
                ->map(function($booking) {
                    return [
                        'id' => $booking->id,
                        'customer_name' => $booking->customer_name,
                        'event_title' => $booking->event ? $booking->event->title : 'Deleted Event',
                        'total_amount' => $booking->total_amount,
                        'status' => $booking->status,
                        'created_at' => $booking->created_at->diffForHumans(),
                    ];
                });

            // Sales breakdown by status
            $statusStats = Booking::select('status', \DB::raw('count(*) as count'))
                ->groupBy('status')
                ->get()
                ->pluck('count', 'status');

            // Popular events (top 3)
            $topEvents = Event::withCount('bookings')
                ->orderBy('bookings_count', 'desc')
                ->take(3)
                ->get()
                ->map(fn($e) => ['title' => $e->title, 'count' => $e->bookings_count]);

            return response()->json([
                'events' => Event::count(),
                'bookings_total' => $ticketsSold,
                'bookings_pending_count' => Booking::where('status', 'pending')->count(),
                'refunds_pending_count' => \App\Models\RefundRequest::where('status', 'pending')->count(),
                'revenue' => (float) $netRevenue,
                'gross_revenue' => (float) $grossRevenue,
                'refunded_amount' => (float) $refundedAmount,
                'status_stats' => $statusStats,
                'top_events' => $topEvents,
                'recent_bookings' => $recentBookings
            ]);
        } else {
            // Customer statistics
            return response()->json([
                'events' => $user->bookings()->where('status', 'confirmed')->count(),
                'bookings' => $user->bookings()
                    ->where('status', 'confirmed')
                    ->whereHas('event', function ($query) {
                        $query->upcoming()->published();
                    })->count(),
                'refunds' => $user->bookings()
                    ->whereIn('status', ['cancelled', 'refunded'])
                    ->count(),
            ]);
        }
    }
}
