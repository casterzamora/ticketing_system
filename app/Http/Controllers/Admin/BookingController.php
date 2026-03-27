<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Event;
use App\Models\Payment;
use App\Models\RefundRequest;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    /**
     * Admin – list all bookings.
     */
    public function index(Request $request)
    {
        $query = Booking::with(['user', 'event', 'payments', 'refundRequest'])
            ->latest();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) =>
                $q->where('booking_reference', 'like', "%$s%")
                  ->orWhere('customer_name', 'like', "%$s%")
                  ->orWhere('customer_email', 'like', "%$s%")
                  ->orWhereHas('event', fn ($eq) => $eq->where('title', 'like', "%$s%"))
            );
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('event_id')) {
            $query->where('event_id', $request->event_id);
        }

        $bookings = $query->paginate(20);

        // Return JSON for API calls or a view for web
        if ($request->expectsJson()) {
            return response()->json([
                'data' => $bookings->map(fn ($b) => [
                    'id'                => $b->id,
                    'booking_reference' => $b->booking_reference,
                    'status'            => $b->status,
                    'customer_name'     => $b->customer_name,
                    'customer_email'    => $b->customer_email,
                    'total_tickets'     => $b->total_tickets,
                    'total_amount'      => (float) $b->total_amount,
                    'created_at'        => $b->created_at?->toIso8601String(),
                    'event'             => $b->event ? ['id' => $b->event->id, 'title' => $b->event->title] : null,
                    'user'              => $b->user  ? ['id' => $b->user->id, 'name' => $b->user->name, 'email' => $b->user->email] : null,
                    'payment_status'    => $b->payments->first()?->status ?? 'none',
                    'refund_status'     => $b->refundRequest?->status,
                ]),
                'total'        => $bookings->total(),
                'current_page' => $bookings->currentPage(),
                'last_page'    => $bookings->lastPage(),
            ]);
        }

        return view('admin.bookings.index', compact('bookings'));
    }

    /**
     * Admin – approve a booking.
     */
    public function approve(Booking $booking)
    {
        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'Only pending bookings can be approved.'], 422);
        }

        $booking->update(['status' => 'confirmed']);

        // Record payment completion
        $booking->payments()->updateOrCreate(
            ['booking_id' => $booking->id, 'status' => 'pending'],
            [
                'amount'         => $booking->total_amount,
                'payment_method' => 'admin_manual',
                'status'         => 'successful',
                'currency'       => 'PHP',
                'processed_at'   => now(),
            ]
        );

        ActivityLogService::log('confirmed', $booking, "Admin manually approved booking {$booking->booking_reference}");

        return response()->json(['message' => 'Booking approved successfully.']);
    }

    /**
     * Admin – reject a booking.
     */
    public function reject(Booking $booking)
    {
        if ($booking->status !== 'pending') {
            return response()->json(['message' => 'Only pending bookings can be rejected.'], 422);
        }

        $booking->update(['status' => 'cancelled']);

        // Restore ticket inventory
        foreach ($booking->bookingTickets as $bt) {
            $bt->ticketType?->decreaseSoldQuantity($bt->quantity);
        }

        ActivityLogService::log('cancelled', $booking, "Admin rejected booking {$booking->booking_reference}");

        return response()->json(['message' => 'Booking rejected successfully.']);
    }

    /**
     * Admin – cancel (void) a booking with policy-based refund logic.
     */
    public function cancel(Request $request, Booking $booking)
    {
        if (!in_array($booking->status, ['pending', 'confirmed'])) {
            return response()->json(['message' => 'Booking cannot be voided.'], 422);
        }

        $validated = $request->validate([
            'void_type' => 'required|in:admin_fault,system_fault,user_fault',
            'reason' => 'required|string|max:500'
        ]);

        $voidType = $validated['void_type'];
        $reason = $validated['reason'];

        // Apply policy
        $shouldRefund = in_array($voidType, ['admin_fault', 'system_fault']);
        
        $booking->update([
            'status' => 'cancelled',
            'void_type' => $voidType,
            'void_reason' => $reason
        ]);

        // Restore ticket inventory
        foreach ($booking->bookingTickets as $bt) {
            $bt->ticketType?->decreaseSoldQuantity($bt->quantity);
        }

        // Automatic Refund Logic (ONLY for Admin/System Faults on Confirmed Bookings)
        if ($shouldRefund && $booking->total_amount > 0) {
            \App\Models\RefundRequest::updateOrCreate(
                ['booking_id' => $booking->id],
                [
                    'user_id' => $booking->user_id,
                    'reason' => "ADMIN VOID ({$voidType}): " . $reason,
                    'refund_amount' => $booking->total_amount,
                    'status' => 'pending', // Finishes in Admin Refund dashboard
                    'refund_method' => 'original'
                ]
            );
        }

        ActivityLogService::log('cancelled', $booking, "Admin voided booking {$booking->booking_reference} ({$voidType}). Reason: {$reason}");

        return response()->json([
            'message' => $shouldRefund 
                ? 'Order voided and refund request generated successfully.' 
                : 'Order voided successfully (No refund due to User Fault policy).'
        ]);
    }

    /**
     * Admin – get revenue summary.
     */
    public function revenue(Request $request)
    {
        $period = $request->get('period', 'month'); // week, month, year

        $query = Payment::where('status', 'completed');

        if ($period === 'week') {
            $query->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()]);
        } elseif ($period === 'month') {
            $query->whereMonth('created_at', now()->month)->whereYear('created_at', now()->year);
        } elseif ($period === 'year') {
            $query->whereYear('created_at', now()->year);
        }

        return response()->json([
            'total_revenue' => (float) $query->sum('amount'),
            'total_bookings' => Booking::whereIn('status', ['confirmed', 'refunded'])->count(),
            'period' => $period,
        ]);
    }
}
