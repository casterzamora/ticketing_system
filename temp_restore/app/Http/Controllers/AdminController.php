<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\Event;
use App\Models\RefundRequest;
use Illuminate\View\View;

class AdminController extends Controller
{
    public function dashboard(): View
    {
        $stats = [
            'events' => Event::count(),
            'tickets_sold' => Booking::where('status', 'confirmed')->sum('total_tickets'),
            'revenue' => Booking::where('status', 'confirmed')->sum('total_amount'),
            'pending_refunds' => RefundRequest::where('status', 'pending')->count(),
        ];

        $recentBookings = Booking::with('event')->latest()->limit(8)->get();
        $pendingRefunds = RefundRequest::with('booking')->where('status', 'pending')->latest()->limit(8)->get();

        return view('admin.dashboard', compact('stats', 'recentBookings', 'pendingRefunds'));
    }
}
