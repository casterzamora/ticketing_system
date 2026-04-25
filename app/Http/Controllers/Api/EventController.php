<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Services\DomainNotificationService;
use App\Services\RefundPolicyService;
use App\Services\SystemSettingsService;
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
            'status' => 'required|in:draft,published,cancelled,completed,rescheduled',
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
            'status' => 'sometimes|in:draft,published,cancelled,completed,rescheduled',
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
                    
                    // Automatically write approved refunds to ledger only for successfully paid bookings.
                    if ($booking->successfulPayment()) {
                        RefundPolicyService::approveToLedger(
                            $booking,
                            'AUTOMATIC REFUND: Event cancelled by administrator.',
                            auth()->id(),
                            'original_source'
                        );
                    } else {
                        RefundPolicyService::releaseInventoryForBooking($booking);
                    }

                    DomainNotificationService::eventCancelled($booking);

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
     * Reschedule the event to a new date and time.
     */
    public function reschedule(Request $request, Event $event)
    {
        $request->validate([
            'new_start_time' => 'required|date|after:now',
            'new_end_time' => 'required|date|after:new_start_time',
            'refund_deadline_hours' => 'nullable|integer|min:24|max:168',
        ]);

        try {
            \Illuminate\Support\Facades\DB::beginTransaction();

            // Store original time for history if not already set
            $originalStartTime = $event->original_start_time ?? $event->start_time;

            $previousStart = \Carbon\Carbon::parse($originalStartTime);
            $nextStart = \Carbon\Carbon::parse($request->new_start_time);
            $shiftHours = max(1, abs($previousStart->diffInHours($nextStart, false)));
            $adaptiveWindowHours = (int) max(24, min(168, (int) ceil($shiftHours * 0.5)));
            
            // Calculate refund deadline
            $refundWindowHours = (int) ($request->refund_deadline_hours
                ?? $adaptiveWindowHours);
            $refundDeadline = now()->addHours($refundWindowHours);

            // Update event times
            $event->update([
                'start_time' => $request->new_start_time,
                'end_time' => $request->new_end_time,
                'original_start_time' => $originalStartTime,
                'rescheduled_at' => now(),
                'status' => 'rescheduled',
                'refund_deadline' => $refundDeadline,
            ]);

            $affectedBookings = $event->bookings()
                ->where('status', 'confirmed')
                ->get();

            // Set all confirmed bookings to 'pending' response status
            $event->bookings()->where('status', 'confirmed')->update([
                'reschedule_response' => 'pending'
            ]);

            $affectedBookings->each(function ($booking) use ($originalStartTime, $refundDeadline, $refundWindowHours) {
                DomainNotificationService::eventRescheduled(
                    $booking,
                    [
                        'old_schedule' => \Carbon\Carbon::parse($originalStartTime)->toDateTimeString(),
                        'new_schedule' => $booking->event?->start_time?->toDateTimeString(),
                        'decision_deadline' => $refundDeadline->toDateTimeString(),
                        'decision_window_hours' => $refundWindowHours,
                        'policy_default_if_no_response' => 'Ticket remains valid for the new schedule.',
                    ]
                );
            });

            // Log activity
            \App\Models\ActivityLog::create([
                'user_id' => auth()->id(),
                'action' => 'rescheduled',
                'subject_type' => 'App\Models\Event',
                'subject_id' => $event->id,
                'description' => "Event '{$event->title}' moved from {$originalStartTime} to {$request->new_start_time}. Refund window closes at {$refundDeadline}.",
                'old_values' => json_encode(['start_time' => $originalStartTime]),
                'new_values' => json_encode([
                    'start_time' => $request->new_start_time,
                    'refund_deadline' => $refundDeadline,
                    'decision_window_hours' => $refundWindowHours,
                ]),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            \Illuminate\Support\Facades\DB::commit();

            return new EventResource($event->fresh());

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Error rescheduling event: ' . $e->getMessage()
            ], 500);
        }
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
                
                // Automatically write approved refunds to ledger only for successfully paid bookings.
                if ($booking->successfulPayment()) {
                    RefundPolicyService::approveToLedger(
                        $booking,
                        'AUTOMATIC REFUND: Event cancelled by administrator.',
                        auth()->id(),
                        'original_source'
                    );
                } else {
                    RefundPolicyService::releaseInventoryForBooking($booking);
                }

                DomainNotificationService::eventCancelled($booking);
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
