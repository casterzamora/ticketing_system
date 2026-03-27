<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\Request;

class EventController extends Controller
{
    /**
     * Get all events for Admin management.
     */
    public function indexAdmin(Request $request)
    {
        $query = Event::with(['categories', 'activeTicketTypes'])
            ->latest();

        if ($request->has('search')) {
            $query->where('title', 'like', '%' . $request->search . '%')
                ->orWhere('venue', 'like', '%' . $request->search . '%');
        }

        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        $events = $query->paginate(15);

        return EventResource::collection($events);
    }

    /**
     * Get all events for React frontend.
     */
    public function index()
    {
        $events = Event::with(['categories', 'activeTicketTypes'])
            ->published()
            ->active()
            ->upcoming()
            ->get();

        return EventResource::collection($events);
    }

    /**
     * Get single event details.
     */
    public function show(Event $event)
    {
        $event->load(['categories', 'activeTicketTypes']);
        return new EventResource($event);
    }

    /**
     * Create new event.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'venue' => 'required|string|max:255',
            'address' => 'required|string|max:500',
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
            'timezone' => 'required|string|max:50',
            'max_capacity' => 'required|integer|min:1',
            'base_price' => 'required|numeric|min:0',
            'image_url' => 'nullable|url',
            'video_url' => 'nullable|url',
            'status' => 'required|in:draft,published,cancelled,completed',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
            'categories' => 'nullable|array',
            'categories.*' => 'exists:event_categories,id',
        ]);

        $event = Event::create([
            'title' => $validated['title'],
            'description' => $validated['description'],
            'venue' => $validated['venue'],
            'address' => $validated['address'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'timezone' => $validated['timezone'],
            'max_capacity' => $validated['max_capacity'],
            'base_price' => $validated['base_price'],
            'image_url' => $validated['image_url'] ?? null,
            'video_url' => $validated['video_url'] ?? null,
            'status' => $validated['status'],
            'is_featured' => $validated['is_featured'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => auth()->id(),
        ]);

        if (!empty($validated['categories'])) {
            $event->categories()->sync($validated['categories']);
        }

        return new EventResource($event);
    }

    /**
     * Update existing event.
     */
    public function update(Request $request, Event $event)
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'venue' => 'sometimes|string|max:255',
            'address' => 'sometimes|string|max:500',
            'start_time' => 'sometimes|date|after:now',
            'end_time' => 'sometimes|date|after:start_time',
            'timezone' => 'sometimes|string|max:50',
            'max_capacity' => 'sometimes|integer|min:1',
            'base_price' => 'sometimes|numeric|min:0',
            'image_url' => 'sometimes|nullable|url',
            'video_url' => 'sometimes|nullable|url',
            'status' => 'sometimes|in:draft,published,cancelled,completed',
            'is_featured' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'categories' => 'sometimes|array',
            'categories.*' => 'exists:event_categories,id',
        ]);

        $oldStatus = $event->status;
        $event->update($validated);

        if ($request->has('categories')) {
            $event->categories()->sync($validated['categories']);
        }

        // Handle Event Cancellation Workflow
        if ($oldStatus !== 'cancelled' && $event->status === 'cancelled') {
            \Illuminate\Support\Facades\DB::transaction(function() use ($event) {
                // Cancel all confirmed/pending bookings
                $bookings = $event->bookings()->whereIn('status', ['confirmed', 'pending'])->get();
                
                foreach ($bookings as $booking) {
                    $booking->update(['status' => 'cancelled']);
                    
                    // Automatically create refund requests for confirmed paid bookings
                    if ($booking->total_amount > 0) {
                        \App\Models\RefundRequest::firstOrCreate(
                            ['booking_id' => $booking->id],
                            [
                                'user_id' => $booking->user_id,
                                'reason' => 'Event cancelled by administrator.',
                                'refund_amount' => $booking->total_amount,
                                'status' => 'pending' // Admin still needs to process the actual payment refund
                            ]
                        );
                    }

                    // Optional: Trigger notification to user
                    // \App\Notifications\EventCancelledNotification::send($booking->user, $event);
                }

                // Log the administrative action
                \App\Models\ActivityLog::create([
                    'user_id' => auth()->id(),
                    'action' => 'event_cancelled',
                    'model_type' => 'App\Models\Event',
                    'model_id' => $event->id,
                    'details' => json_encode(['title' => $event->title, 'bookings_affected' => $bookings->count()]),
                    'ip_address' => request()->ip()
                ]);
            });
        }

        return new EventResource($event);
    }

    /**
     * Delete event.
     */
    public function destroy(Event $event)
    {
        $event->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Event deleted successfully'
        ]);
    }

    /**
     * Cancel event and trigger refund requests.
     */
    public function cancel(Event $event)
    {
        if ($event->status === 'cancelled') {
            return response()->json([
                'success' => false,
                'message' => 'Event is already cancelled.'
            ], 422);
        }

        \Illuminate\Support\Facades\DB::transaction(function() use ($event) {
            $event->update(['status' => 'cancelled']);

            // Cancel all confirmed/pending bookings
            $bookings = $event->bookings()->whereIn('status', ['confirmed', 'pending', 'paid'])->get();
            
            foreach ($bookings as $booking) {
                $booking->update(['status' => 'cancelled']);
                
                // Automatically create refund requests for confirmed paid bookings
                if ($booking->total_amount > 0) {
                    \App\Models\RefundRequest::firstOrCreate(
                        ['booking_id' => $booking->id],
                        [
                            'user_id' => $booking->user_id,
                            'reason' => 'Event cancelled by administrator.',
                            'refund_amount' => $booking->total_amount,
                            'status' => 'pending'
                        ]
                    );
                }
            }

            // Log the administrative action
            \App\Services\ActivityLogService::log(
                'event_cancelled',
                $event,
                "Event cancelled by administrator. Affected bookings: " . $bookings->count()
            );
        });

        return response()->json([
            'success' => true,
            'message' => 'Event cancelled and bookings updated.'
        ]);
    }
}
