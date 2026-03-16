<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\StoreBookingRequest;
use App\Models\Event;
use App\Models\Booking;
use App\Models\BookingTicket;
use App\Models\TicketType;
use App\Services\BookingService;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * User Booking Controller
 * 
 * This controller handles customer booking operations including
 * event browsing, ticket selection, and booking management.
 * 
 * Business Logic:
 * - Customer access control
 * - Double booking prevention
 * - Ticket availability validation
 * - Pricing calculations
 * - Booking reference generation
 * - Activity logging
 * - Database transactions for data integrity
 */
class BookingController extends Controller
{
    /**
     * Display available events for booking.
     * 
     * This method shows upcoming events that are available for
     * customer bookings with filtering and search capabilities.
     * 
     * @param Request $request
     * @return View
     */
    public function events(Request $request): View
    {
        $query = Event::with(['categories', 'activeTicketTypes'])
            ->published()
            ->active()
            ->upcoming()
            ->withBookingStats();

        // Apply filters
        if ($request->filled('category')) {
            $query->whereHas('categories', function ($categoryQuery) use ($request) {
                $categoryQuery->where('event_categories.slug', $request->category);
            });
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('venue', 'like', "%{$search}%");
            });
        }

        if ($request->filled('price_min')) {
            $query->where('base_price', '>=', $request->price_min);
        }

        if ($request->filled('price_max')) {
            $query->where('base_price', '<=', $request->price_max);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('start_time', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('start_time', '<=', $request->date_to);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'start_time');
        $sortOrder = $request->get('sort_order', 'asc');
        
        $validSorts = ['start_time', 'title', 'base_price', 'created_at'];
        if (in_array($sortBy, $validSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        }

        $events = $query->paginate(12);

        // Get categories for filter dropdown
        $categories = \App\Models\EventCategory::active()->ordered()->get();

        return view('user.bookings.events', compact('events', 'categories'));
    }

    /**
     * Display event details for booking.
     * 
     * This method shows detailed event information including
     * available ticket types and booking options.
     * 
     * @param Event $event
     * @return View
     */
    public function showEvent(Event $event): View
    {
        // Check if event is bookable
        if (!$event->isBookable()) {
            return redirect()
                ->route('user.events')
                ->with('error', 'This event is not available for booking.');
        }

        $event->load([
            'categories',
            'activeTicketTypes' => function ($query) {
                $query->available()->orderBy('price');
            }
        ]);

        // Check if user already has a booking for this event
        $existingBooking = null;
        if (auth()->check()) {
            $existingBooking = Booking::where('user_id', auth()->id())
                ->where('event_id', $event->id)
                ->first();
        }

        return view('user.bookings.show-event', compact('event', 'existingBooking'));
    }

    /**
     * Show the booking form for an event.
     * 
     * This method displays the booking form where customers can
     * select ticket types and quantities.
     * 
     * @param Event $event
     * @return View
     */
    public function create(Event $event): View
    {
        // Check if event is bookable
        if (!$event->isBookable()) {
            return redirect()
                ->route('user.events')
                ->with('error', 'This event is not available for booking.');
        }

        // Check if user already has a booking for this event
        if (auth()->check()) {
            $existingBooking = Booking::where('user_id', auth()->id())
                ->where('event_id', $event->id)
                ->first();

            if ($existingBooking) {
                return redirect()
                    ->route('user.bookings.show', $existingBooking)
                    ->with('error', 'You already have a booking for this event.');
            }
        }

        $event->load(['activeTicketTypes' => function ($query) {
            $query->available()->orderBy('price');
        }]);

        return view('user.bookings.create', compact('event'));
    }

    /**
     * Store a new booking.
     * 
     * This method processes booking creation with validation,
     * inventory management, and payment initiation.
     * 
     * @param StoreBookingRequest $request
     * @param Event $event
     * @return RedirectResponse
     */
    public function store(StoreBookingRequest $request, Event $event): RedirectResponse
    {
        try {
            // Check if event is still bookable
            if (!$event->isBookable()) {
                return redirect()
                    ->back()
                    ->withInput()
                    ->with('error', 'This event is no longer available for booking.');
            }

            // Check if user already has a booking for this event
            if (auth()->check()) {
                $existingBooking = Booking::where('user_id', auth()->id())
                    ->where('event_id', $event->id)
                    ->first();

                if ($existingBooking) {
                    return redirect()
                        ->back()
                        ->withInput()
                        ->with('error', 'You already have a booking for this event.');
                }
            }

            // Validate ticket availability
            $ticketQuantities = $request->tickets;
            $totalAmount = 0;
            $totalTickets = 0;

            foreach ($ticketQuantities as $ticketTypeId => $quantity) {
                if ($quantity > 0) {
                    $ticketType = TicketType::find($ticketTypeId);
                    
                    if (!$ticketType || $ticketType->event_id !== $event->id) {
                        return redirect()
                            ->back()
                            ->withInput()
                            ->with('error', 'Invalid ticket type selected.');
                    }

                    if (!$ticketType->isAvailable() || $ticketType->available_quantity < $quantity) {
                        return redirect()
                            ->back()
                            ->withInput()
                            ->with('error', "Not enough tickets available for {$ticketType->name}.");
                    }

                    $totalAmount += $ticketType->price * $quantity;
                    $totalTickets += $quantity;
                }
            }

            if ($totalTickets === 0) {
                return redirect()
                    ->back()
                    ->withInput()
                    ->with('error', 'Please select at least one ticket.');
            }

            // Create booking using service
            $booking = BookingService::createBooking([
                'event_id' => $event->id,
                'user_id' => auth()->id(),
                'customer_name' => $request->customer_name,
                'customer_email' => $request->customer_email,
                'customer_phone' => $request->customer_phone,
                'special_requirements' => $request->special_requirements,
                'tickets' => $ticketQuantities,
                'total_amount' => $totalAmount,
                'total_tickets' => $totalTickets,
            ]);

            if (!$booking) {
                return redirect()
                    ->back()
                    ->withInput()
                    ->with('error', 'Error creating booking. Please try again.');
            }

            // Log activity
            ActivityLogService::logBooking('created', $booking);

            return redirect()
                ->route('user.bookings.payment', $booking)
                ->with('success', 'Booking created successfully! Please complete payment.');

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Error creating booking: ' . $e->getMessage());
        }
    }

    /**
     * Display the payment page for a booking.
     * 
     * This method shows the payment form where customers can
     * complete their booking payment.
     * 
     * @param Booking $booking
     * @return View
     */
    public function payment(Booking $booking): View
    {
        // Verify booking ownership
        if (auth()->id() !== $booking->user_id) {
            abort(403);
        }

        // Check if booking is still pending
        if (!$booking->isPending()) {
            return redirect()
                ->route('user.bookings.show', $booking)
                ->with('info', 'This booking has already been processed.');
        }

        $booking->load(['event', 'bookingTickets.ticketType']);

        return view('user.bookings.payment', compact('booking'));
    }

    /**
     * Process payment for a booking.
     * 
     * This method handles payment processing and booking confirmation.
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function processPayment(Request $request, Booking $booking): RedirectResponse
    {
        try {
            // Verify booking ownership
            if (auth()->id() !== $booking->user_id) {
                abort(403);
            }

            // Check if booking is still pending
            if (!$booking->isPending()) {
                return redirect()
                    ->route('user.bookings.show', $booking)
                    ->with('info', 'This booking has already been processed.');
            }

            $request->validate([
                'payment_method' => 'required|in:credit_card,paypal,bank_transfer',
            ]);

            // Process payment using service
            $payment = BookingService::processPayment($booking, $request->payment_method);

            if (!$payment) {
                return redirect()
                    ->back()
                    ->with('error', 'Payment processing failed. Please try again.');
            }

            // Log activity
            ActivityLogService::logPayment($payment->status, $payment);

            if ($payment->isSuccessful()) {
                return redirect()
                    ->route('user.bookings.show', $booking)
                    ->with('success', 'Payment successful! Your booking is confirmed.');
            } else {
                return redirect()
                    ->back()
                    ->with('error', 'Payment failed. Please try again or contact support.');
            }

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Error processing payment: ' . $e->getMessage());
        }
    }

    /**
     * Display the user's bookings.
     * 
     * This method shows all bookings made by the authenticated user
     * with filtering and search capabilities.
     * 
     * @param Request $request
     * @return View
     */
    public function index(Request $request): View
    {
        $query = Booking::with(['event', 'bookingTickets.ticketType'])
            ->where('user_id', auth()->id());

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('booking_reference', 'like', "%{$search}%")
                  ->orWhereHas('event', function ($eventQuery) use ($search) {
                      $eventQuery->where('title', 'like', "%{$search}%");
                  });
            });
        }

        $bookings = $query->latest()->paginate(10);

        return view('user.bookings.index', compact('bookings'));
    }

    /**
     * Display the specified booking.
     * 
     * This method shows detailed booking information including
     * tickets, payments, and available actions.
     * 
     * @param Booking $booking
     * @return View
     */
    public function show(Booking $booking): View
    {
        // Verify booking ownership
        if (auth()->id() !== $booking->user_id) {
            abort(403);
        }

        $booking->load([
            'event',
            'bookingTickets.ticketType',
            'payments' => function ($query) {
                $query->latest();
            },
            'refundRequest'
        ]);

        return view('user.bookings.show', compact('booking'));
    }

    /**
     * Cancel a booking.
     * 
     * This method handles booking cancellation with proper validation
     * and inventory management.
     * 
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function cancel(Booking $booking): RedirectResponse
    {
        try {
            // Verify booking ownership
            if (auth()->id() !== $booking->user_id) {
                abort(403);
            }

            // Check if booking can be cancelled
            if (!$booking->isCancellable()) {
                return redirect()
                    ->back()
                    ->with('error', 'This booking cannot be cancelled.');
            }

            // Cancel booking using service
            $success = BookingService::cancelBooking($booking);

            if (!$success) {
                return redirect()
                    ->back()
                    ->with('error', 'Error cancelling booking. Please try again.');
            }

            // Log activity
            ActivityLogService::logBooking('cancelled', $booking);

            return redirect()
                ->route('user.bookings.show', $booking)
                ->with('success', 'Booking cancelled successfully!');

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Error cancelling booking: ' . $e->getMessage());
        }
    }

    /**
     * Request a refund for a booking.
     * 
     * This method creates a refund request for an eligible booking.
     * 
     * @param Request $request
     * @param Booking $booking
     * @return RedirectResponse
     */
    public function requestRefund(Request $request, Booking $booking): RedirectResponse
    {
        try {
            // Verify booking ownership
            if (auth()->id() !== $booking->user_id) {
                abort(403);
            }

            // Check if booking is refundable
            if (!$booking->isRefundable()) {
                return redirect()
                    ->back()
                    ->with('error', 'This booking is not eligible for refund.');
            }

            $request->validate([
                'reason' => 'required|string|max:1000',
            ]);

            // Create refund request using service
            $refundRequest = BookingService::createRefundRequest($booking, $request->reason);

            if (!$refundRequest) {
                return redirect()
                    ->back()
                    ->with('error', 'Error creating refund request. Please try again.');
            }

            // Log activity
            ActivityLogService::logRefundRequest('created', $refundRequest);

            return redirect()
                ->route('user.bookings.show', $booking)
                ->with('success', 'Refund request submitted successfully! We will review it shortly.');

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Error creating refund request: ' . $e->getMessage());
        }
    }
}
