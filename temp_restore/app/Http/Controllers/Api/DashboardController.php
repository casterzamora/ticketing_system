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
            return response()->json([
                'events' => Event::count(),
                'bookings' => Booking::count(),
                'refunds' => \App\Models\RefundRequest::pending()->count(),
            ]);
        } else {
            // Customer statistics
            return response()->json([
                'events' => $user->bookings()->count(),
                'bookings' => $user->bookings()->whereHas('event', function ($query) {
                    $query->upcoming();
                })->count(),
                'refunds' => $user->bookings()->whereHas('event', function ($query) {
                    $query->where('start_time', '<', now());
                })->count(),
            ]);
        }
    }
}
