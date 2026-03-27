<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\TicketType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TicketTypeController extends Controller
{
    /**
     * Create a new ticket type for an event.
     */
    public function store(Request $request, Event $event)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'quantity_available' => 'required|integer|min:1',
            'is_active' => 'boolean',
        ]);

        try {
            DB::beginTransaction();

            $ticketType = $event->ticketTypes()->create([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'price' => $validated['price'],
                'quantity_available' => $validated['quantity_available'],
                'quantity_sold' => 0,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Ticket type created successfully',
                'data' => [
                    'id' => $ticketType->id,
                    'name' => $ticketType->name,
                    'description' => $ticketType->description,
                    'price' => (float) $ticketType->price,
                    'quantity_available' => $ticketType->quantity_available,
                    'quantity_sold' => $ticketType->quantity_sold,
                    'remaining' => $ticketType->quantity_available - $ticketType->quantity_sold,
                    'is_active' => (bool) $ticketType->is_active,
                ]
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create ticket type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update a ticket type.
     */
    public function update(Request $request, Event $event, TicketType $ticketType)
    {
        // Verify ticket type belongs to this event
        if ($ticketType->event_id !== $event->id) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket type not found'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
            'price' => 'sometimes|numeric|min:0',
            'quantity_available' => 'sometimes|integer|min:1',
            'is_active' => 'sometimes|boolean',
        ]);

        try {
            DB::beginTransaction();

            $ticketType->update($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Ticket type updated successfully',
                'data' => [
                    'id' => $ticketType->id,
                    'name' => $ticketType->name,
                    'description' => $ticketType->description,
                    'price' => (float) $ticketType->price,
                    'quantity_available' => $ticketType->quantity_available,
                    'quantity_sold' => $ticketType->quantity_sold,
                    'remaining' => $ticketType->quantity_available - $ticketType->quantity_sold,
                    'is_active' => (bool) $ticketType->is_active,
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update ticket type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a ticket type.
     */
    public function destroy(Event $event, TicketType $ticketType)
    {
        // Verify ticket type belongs to this event
        if ($ticketType->event_id !== $event->id) {
            return response()->json([
                'success' => false,
                'message' => 'Ticket type not found'
            ], 404);
        }

        // Prevent deletion if tickets have been sold
        if ($ticketType->quantity_sold > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete ticket type with existing sales'
            ], 422);
        }

        try {
            $ticketType->delete();

            return response()->json([
                'success' => true,
                'message' => 'Ticket type deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete ticket type',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
