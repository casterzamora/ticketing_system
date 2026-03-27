<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\TicketTypeController;
use App\Http\Controllers\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Admin\RefundRequestController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
| React SPA communicates exclusively through these JSON routes.
| Session-based auth (stateful) is used via Laravel Sanctum.
|--------------------------------------------------------------------------
*/

// ------------------------------------------------------------------
// Public API routes (no authentication required)
// ------------------------------------------------------------------
Route::get('/csrf-cookie', function () {
    // Hitting this endpoint ensures session + XSRF-TOKEN cookies are set.
    return response()->json(['message' => 'CSRF cookie set.']);
});

Route::get('/events', [EventController::class, 'index']);
Route::get('/events/{event}', [EventController::class, 'show']);

// ------------------------------------------------------------------
// API Login / Register (returns JSON for the React SPA)
// ------------------------------------------------------------------
Route::post('/login', function (\Illuminate\Http\Request $request) {
    $credentials = $request->validate([
        'email'    => 'required|email',
        'password' => 'required',
    ]);

    if (!\Illuminate\Support\Facades\Auth::attempt($credentials, $request->boolean('remember'))) {
        return response()->json(['message' => 'Invalid credentials.'], 401);
    }

    $request->session()->regenerate();
    $user = \Illuminate\Support\Facades\Auth::user();

    return response()->json([
        'id'       => $user->id,
        'name'     => $user->name,
        'email'    => $user->email,
        'is_admin' => $user->isAdmin(),
    ]);
});

Route::post('/register', function (\Illuminate\Http\Request $request) {
    $data = $request->validate([
        'name'                  => 'required|string|max:255',
        'email'                 => 'required|email|unique:users,email',
        'password'              => 'required|confirmed|min:8',
    ]);

    $user = \App\Models\User::create([
        'name'     => $data['name'],
        'email'    => $data['email'],
        'password' => \Illuminate\Support\Facades\Hash::make($data['password']),
        'is_active' => true,
    ]);
    $user->assignRole('user');

    \Illuminate\Support\Facades\Auth::login($user);
    $request->session()->regenerate();

    return response()->json([
        'id'       => $user->id,
        'name'     => $user->name,
        'email'    => $user->email,
        'is_admin' => false,
    ], 201);
});

Route::post('/logout', function (\Illuminate\Http\Request $request) {
    \Illuminate\Support\Facades\Auth::logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return response()->json(['message' => 'Logged out.']);
});

// ------------------------------------------------------------------
// Protected routes (authenticated users, session-based)
// ------------------------------------------------------------------
Route::middleware('auth')->group(function () {

    // Authenticated user info
    Route::get('/user', [UserController::class, 'user']);

    // Dashboard stats (role-aware)
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // ------------------------------------------------------------------
    // Customer (user) routes
    // ------------------------------------------------------------------
    Route::prefix('user')->group(function () {
        // Bookings
        Route::get('/bookings', [BookingController::class, 'index']);
        Route::get('/bookings/{booking}', [BookingController::class, 'show']);
        Route::post('/bookings', [BookingController::class, 'store']);

        // Refund requests
        Route::post('/bookings/{booking}/refund', function (\Illuminate\Http\Request $request, \App\Models\Booking $booking) {
            if ($booking->user_id !== auth()->id()) {
                return response()->json(['message' => 'Unauthorized.'], 403);
            }

            $request->validate(['reason' => 'required|string|max:1000']);

            if ($booking->refundRequest) {
                return response()->json(['message' => 'Refund request already submitted.'], 422);
            }

            if (!in_array($booking->status, ['confirmed', 'pending'])) {
                return response()->json(['message' => 'This booking cannot be refunded.'], 422);
            }

            // 48-hour rule
            $event = $booking->event;
            if ($event && $event->start_time->diffInHours(now(), false) > -48) {
                return response()->json(['message' => 'Refund requests must be submitted at least 48 hours before the event.'], 422);
            }

            $refund = \App\Models\RefundRequest::create([
                'booking_id' => $booking->id,
                'reason'     => $request->reason,
                'status'     => 'pending',
            ]);

            return response()->json(['message' => 'Refund request submitted.', 'refund' => $refund], 201);
        });
    });

    // ------------------------------------------------------------------
    // Admin routes
    // ------------------------------------------------------------------
    Route::middleware('admin')->prefix('admin')->group(function () {

        // Events (full CRUD)
        Route::apiResource('events', EventController::class)->except(['index', 'show']);

        // Ticket types (nested under events)
        Route::post('/events/{event}/ticket-types', [TicketTypeController::class, 'store']);
        Route::put('/events/{event}/ticket-types/{ticketType}', [TicketTypeController::class, 'update']);
        Route::delete('/events/{event}/ticket-types/{ticketType}', [TicketTypeController::class, 'destroy']);

        // Bookings management
        Route::get('/bookings', [AdminBookingController::class, 'index']);
        Route::post('/bookings/{booking}/cancel', [AdminBookingController::class, 'cancel']);
        Route::get('/revenue', [AdminBookingController::class, 'revenue']);

        // Refund management
        Route::get('/refund-requests', [RefundRequestController::class, 'index']);
        Route::post('/refund-requests/{refundRequest}/approve', [RefundRequestController::class, 'approve']);
        Route::post('/refund-requests/{refundRequest}/reject', [RefundRequestController::class, 'reject']);

        // User management
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users/{user}/toggle-active', [UserController::class, 'toggleActive']);
        Route::post('/users/{user}/assign-role', [UserController::class, 'assignRole']);
        Route::get('/users/{user}/bookings', [UserController::class, 'bookings']);
    });
});
