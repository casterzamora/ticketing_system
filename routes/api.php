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
    $request->validate([
        'login'    => 'required|string',
        'password' => 'required',
    ]);

    $login = $request->input('login');
    $field = filter_var($login, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

    if (!\Illuminate\Support\Facades\Auth::attempt([$field => $login, 'password' => $request->password], $request->boolean('remember'))) {
        return response()->json(['message' => 'Invalid credentials.'], 401);
    }

    $request->session()->regenerate();
    $user = \Illuminate\Support\Facades\Auth::user();

    if (!$user->isActive()) {
        \Illuminate\Support\Facades\Auth::logout();
        return response()->json(['message' => 'Your account has been suspended.'], 403);
    }

    return response()->json([
        'id'       => $user->id,
        'name'     => $user->name,
        'email'    => $user->email,
        'username' => $user->username,
        'is_admin' => $user->isAdmin(),
    ]);
});

Route::post('/register', function (\Illuminate\Http\Request $request) {
    $data = $request->validate([
        'first_name'            => 'required|string|max:100',
        'last_name'             => 'required|string|max:100',
        'username'              => 'required|string|max:100|unique:users,username|alpha_dash',
        'email'                 => 'required|email|unique:users,email',
        'phone'                 => 'nullable|string|max:20',
        'password'              => 'required|confirmed|min:8',
        'terms'                 => 'accepted',
    ]);

    $user = \App\Models\User::create([
        'name'       => $data['first_name'] . ' ' . $data['last_name'],
        'first_name' => $data['first_name'],
        'last_name'  => $data['last_name'],
        'username'   => $data['username'],
        'email'      => $data['email'],
        'phone'      => $data['phone'] ?? null,
        'password'   => \Illuminate\Support\Facades\Hash::make($data['password']),
        'is_active'  => true,
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
    Route::put('/user/profile', [UserController::class, 'update']); // Shared profile update route

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

            $request->validate(['reason' => 'nullable|string|max:1000']);

            if ($booking->refundRequest) {
                return response()->json(['message' => 'Refund request already submitted.'], 422);
            }

            // Industry standard guard: Only refundable if event is CANCELLED
            if (!$booking->isRefundable()) {
                return response()->json(['message' => 'Tickets are non-refundable unless the event is officially cancelled.'], 422);
            }

            $refund = \App\Models\RefundRequest::create([
                'booking_id'    => $booking->id,
                'user_id'       => $booking->user_id,
                'refund_amount' => $booking->total_amount,
                'reason'        => $request->reason,
                'status'        => 'pending',
            ]);

            return response()->json(['message' => 'Refund request submitted.', 'refund' => $refund], 201);
        });
    });

    // ------------------------------------------------------------------
    // Admin routes
    // ------------------------------------------------------------------
    Route::middleware('admin')->prefix('admin')->group(function () {

        // Events (full CRUD)
        Route::get('/events', [EventController::class, 'indexAdmin']);
        Route::patch('/events/{event}/cancel', [EventController::class, 'cancel']);
        Route::apiResource('events', EventController::class)->except(['index', 'show']);

        // Ticket types (nested under events)
        Route::post('/events/{event}/ticket-types', [TicketTypeController::class, 'store']);
        Route::put('/events/{event}/ticket-types/{ticketType}', [TicketTypeController::class, 'update']);
        Route::delete('/events/{event}/ticket-types/{ticketType}', [TicketTypeController::class, 'destroy']);

        // Bookings management
        Route::get('/bookings', [AdminBookingController::class, 'index']);
        Route::post('/bookings/{booking}/approve', [AdminBookingController::class, 'approve']);
        Route::post('/bookings/{booking}/reject', [AdminBookingController::class, 'reject']);
        Route::post('/bookings/{booking}/cancel', [AdminBookingController::class, 'cancel']);
        Route::get('/revenue', [AdminBookingController::class, 'revenue']);

        // Refund management
        Route::get('/refund-requests', [RefundRequestController::class, 'index']);
        Route::post('/refund-requests/{refundRequest}/approve', [RefundRequestController::class, 'approve']);
        Route::post('/refund-requests/{refundRequest}/reject', [RefundRequestController::class, 'reject']);

        // User management
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{user}', [UserController::class, 'show']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::post('/users/{user}/toggle-active', [UserController::class, 'toggleActive']);
        Route::post('/users/{user}/assign-role', [UserController::class, 'assignRole']);
        Route::get('/users/{user}/bookings', [UserController::class, 'bookings']);
    });
});
