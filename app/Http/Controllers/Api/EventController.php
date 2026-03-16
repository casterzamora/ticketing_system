<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use Illuminate\Http\Request;

class EventController extends Controller
{
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
            'status' => 'required|in:draft,published,cancelled,completed',
            'is_featured' => 'boolean',
            'is_active' => 'boolean',
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
            'status' => $validated['status'],
            'is_featured' => $validated['is_featured'] ?? false,
            'is_active' => $validated['is_active'] ?? true,
            'created_by' => auth()->id(),
        ]);

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
            'status' => 'sometimes|in:draft,published,cancelled,completed',
            'is_featured' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
        ]);

        $event->update($validated);

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
}
