<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BookingController extends Controller
{
    /**
     * Get user's bookings.
     */
    public function index()
    {
        $bookings = Auth::user()->bookings()
            ->with(['event', 'bookingTickets', 'refundRequest'])
            ->latest()
            ->get();

        return BookingResource::collection($bookings);
    }

    /**
     * Get single booking details.
     */
    public function show(Booking $booking)
    {
        // Check if user owns this booking
        if (Auth::id() !== $booking->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $booking->load(['event', 'bookingTickets', 'refundRequest', 'payments']);
        return new BookingResource($booking);
    }

    /**
     * Create new booking.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'required|exists:events,id',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'special_requirements' => 'nullable|string|max:1000',
            'tickets' => 'required|array|min:1',
            'tickets.*' => 'required|integer|min:1|max:10',
        ]);

        // Check if user already has booking for this event
        $existingBooking = Booking::where('user_id', Auth::id())
            ->where('event_id', $validated['event_id'])
            ->first();

        if ($existingBooking) {
            return response()->json([
                'success' => false,
                'message' => 'Booking already exists.'
            ], 422);
        }

        // Calculate total amount
        $totalAmount = 0;
        foreach ($validated['tickets'] as $ticketTypeId => $quantity) {
            if ($quantity > 0) {
                $ticketType = \App\Models\TicketType::findOrFail($ticketTypeId);
                $totalAmount += $ticketType->price * $quantity;
            }
        }

        // Prepare booking data
        $bookingData = array_merge($validated, [
            'user_id' => Auth::id(),
            'booking_reference' => 'BK-' . date('Y') . '-' . strtoupper(substr(uniqid(), -5)),
            'total_tickets' => array_sum($validated['tickets']),
            'total_amount' => $totalAmount,
            'status' => 'pending',
        ]);

        $booking = BookingService::createBooking($bookingData);

        if ($booking) {
            return response()->json([
                'success' => true,
                'message' => 'Booking created.',
                'data' => new BookingResource($booking)
            ], 201);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Creation failed.'
            ], 500);
        }
    }

    /**
     * Cancel booking.
     */
    public function cancel(Booking $booking)
    {
        // Check if user owns this booking
        if (Auth::id() !== $booking->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $success = BookingService::cancelBooking($booking);

        if ($success) {
            return response()->json([
                'success' => true,
                'message' => 'Booking cancelled.',
                'data' => new BookingResource($booking)
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Cannot cancel.'
            ], 422);
        }
    }

    /**
     * Request refund for booking.
     */
    public function requestRefund(Booking $booking, Request $request)
    {
        $validated = $request->validate([
            'reason' => 'required|string|min:10|max:1000',
        ]);

        // Check if user owns this booking
        if (Auth::id() !== $booking->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        $refundRequest = BookingService::createRefundRequest($booking, $validated['reason']);

        if ($refundRequest) {
            return response()->json([
                'success' => true,
                'message' => 'Refund request submitted successfully',
                'data' => $refundRequest
            ], 201);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Cannot request refund for this booking'
            ], 422);
        }
    }
}
