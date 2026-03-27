<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTicketTypeRequest;
use App\Http\Requests\Admin\UpdateTicketTypeRequest;
use App\Models\Event;
use App\Models\TicketType;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * Admin TicketType Controller
 * 
 * This controller handles ticket type management for events.
 * Ticket types define different pricing tiers and categories for events.
 * 
 * Business Logic:
 * - Admin-only access control
 * - Ticket type creation with validation
 * - Quantity management to prevent overselling
 * - Price and availability management
 * - Activity logging for audit trail
 * - Database transactions for data integrity
 */
class TicketTypeController extends Controller
{
    /**
     * Display a listing of ticket types for an event.
     * 
     * This method shows all ticket types for a specific event
     * with sales statistics and performance metrics.
     * 
     * @param Event $event
     * @return View
     */
    public function index(Event $event): View
    {
        $ticketTypes = $event->ticketTypes()
            ->withSalesStats()
            ->orderBy('price')
            ->get();

        return view('admin.ticket-types.index', compact('event', 'ticketTypes'));
    }

    /**
     * Show the form for creating a new ticket type.
     * 
     * This method displays the ticket type creation form
     * for a specific event.
     * 
     * @param Event $event
     * @return View
     */
    public function create(Event $event): View
    {
        // Check if event allows new ticket types
        if ($event->status === 'cancelled' || $event->status === 'completed') {
            return redirect()
                ->route('admin.events.show', $event)
                ->with('error', 'Cannot add ticket types to cancelled or completed events.');
        }

        return view('admin.ticket-types.create', compact('event'));
    }

    /**
     * Store a newly created ticket type in storage.
     * 
     * This method handles ticket type creation with validation
     * and ensures business rules are followed.
     * 
     * @param StoreTicketTypeRequest $request
     * @param Event $event
     * @return RedirectResponse
     */
    public function store(StoreTicketTypeRequest $request, Event $event): RedirectResponse
    {
        try {
            DB::beginTransaction();

            // Create ticket type
            $ticketType = $event->ticketTypes()->create([
                'name' => $request->name,
                'description' => $request->description,
                'price' => $request->price,
                'quantity_available' => $request->quantity_available,
                'quantity_sold' => 0,
                'is_active' => $request->boolean('is_active'),
            ]);

            // Log activity
            ActivityLogService::log('created', $ticketType, "Ticket type '{$ticketType->name}' created for event '{$event->title}'");

            DB::commit();

            return redirect()
                ->route('admin.events.ticket-types.index', $event)
                ->with('success', 'Ticket type created successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Error creating ticket type: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified ticket type.
     * 
     * This method shows detailed ticket type information including
     * sales data and booking history.
     * 
     * @param Event $event
     * @param TicketType $ticketType
     * @return View
     */
    public function show(Event $event, TicketType $ticketType): View
    {
        // Verify ticket type belongs to event
        if ($ticketType->event_id !== $event->id) {
            abort(404);
        }

        $ticketType->load([
            'bookingTickets' => function ($query) {
                $query->with('booking.user')->latest()->limit(20);
            }
        ]);

        // Calculate statistics
        $stats = [
            'total_bookings' => $ticketType->bookingTickets()->count(),
            'total_revenue' => $ticketType->bookingTickets()->sum('total_price'),
            'sold_percentage' => $ticketType->sold_percentage,
            'available_quantity' => $ticketType->available_quantity,
        ];

        return view('admin.ticket-types.show', compact('event', 'ticketType', 'stats'));
    }

    /**
     * Show the form for editing the specified ticket type.
     * 
     * This method displays the ticket type edit form
     * with current data.
     * 
     * @param Event $event
     * @param TicketType $ticketType
     * @return View
     */
    public function edit(Event $event, TicketType $ticketType): View
    {
        // Verify ticket type belongs to event
        if ($ticketType->event_id !== $event->id) {
            abort(404);
        }

        // Check if ticket type can be edited
        if ($ticketType->quantity_sold > 0) {
            return redirect()
                ->route('admin.events.ticket-types.show', [$event, $ticketType])
                ->with('error', 'Cannot edit ticket types with existing sales.');
        }

        return view('admin.ticket-types.edit', compact('event', 'ticketType'));
    }

    /**
     * Update the specified ticket type in storage.
     * 
     * This method handles ticket type updates with validation
     * and business rule enforcement.
     * 
     * @param UpdateTicketTypeRequest $request
     * @param Event $event
     * @param TicketType $ticketType
     * @return RedirectResponse
     */
    public function update(UpdateTicketTypeRequest $request, Event $event, TicketType $ticketType): RedirectResponse
    {
        try {
            // Verify ticket type belongs to event
            if ($ticketType->event_id !== $event->id) {
                abort(404);
            }

            // Check if ticket type can be edited
            if ($ticketType->quantity_sold > 0) {
                return redirect()
                    ->back()
                    ->with('error', 'Cannot edit ticket types with existing sales.');
            }

            DB::beginTransaction();

            // Store old values for activity log
            $oldValues = $ticketType->only(['name', 'description', 'price', 'quantity_available', 'is_active']);

            // Update ticket type
            $ticketType->update([
                'name' => $request->name,
                'description' => $request->description,
                'price' => $request->price,
                'quantity_available' => $request->quantity_available,
                'is_active' => $request->boolean('is_active'),
            ]);

            // Log activity
            $newValues = $ticketType->only(['name', 'description', 'price', 'quantity_available', 'is_active']);
            ActivityLogService::log('updated', $ticketType, "Ticket type '{$ticketType->name}' updated", $oldValues, $newValues);

            DB::commit();

            return redirect()
                ->route('admin.events.ticket-types.show', [$event, $ticketType])
                ->with('success', 'Ticket type updated successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Error updating ticket type: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified ticket type from storage.
     * 
     * This method handles ticket type deletion with proper validation
     * to prevent deletion of ticket types with sales.
     * 
     * @param Event $event
     * @param TicketType $ticketType
     * @return RedirectResponse
     */
    public function destroy(Event $event, TicketType $ticketType): RedirectResponse
    {
        try {
            // Verify ticket type belongs to event
            if ($ticketType->event_id !== $event->id) {
                abort(404);
            }

            // Check if ticket type has sales
            if ($ticketType->quantity_sold > 0) {
                return redirect()
                    ->back()
                    ->with('error', 'Cannot delete ticket types with existing sales.');
            }

            DB::beginTransaction();

            $ticketTypeName = $ticketType->name;
            $ticketType->delete();

            // Log activity
            ActivityLogService::log('deleted', $ticketType, "Ticket type '{$ticketTypeName}' deleted from event '{$event->title}'");

            DB::commit();

            return redirect()
                ->route('admin.events.ticket-types.index', $event)
                ->with('success', 'Ticket type deleted successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            
            return redirect()
                ->back()
                ->with('error', 'Error deleting ticket type: ' . $e->getMessage());
        }
    }

    /**
     * Toggle ticket type active status.
     * 
     * This method enables or disables a ticket type for sale
     * without deleting it.
     * 
     * @param Event $event
     * @param TicketType $ticketType
     * @return RedirectResponse
     */
    public function toggleActive(Event $event, TicketType $ticketType): RedirectResponse
    {
        try {
            // Verify ticket type belongs to event
            if ($ticketType->event_id !== $event->id) {
                abort(404);
            }

            $ticketType->update(['is_active' => !$ticketType->is_active]);
            $status = $ticketType->is_active ? 'activated' : 'deactivated';

            // Log activity
            ActivityLogService::log($status, $ticketType, "Ticket type '{$ticketType->name}' {$status}");

            return redirect()
                ->back()
                ->with('success', "Ticket type {$status} successfully!");

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Error updating ticket type status: ' . $e->getMessage());
        }
    }

    /**
     * Update ticket type quantity.
     * 
     * This method allows admins to increase the available quantity
     * for a ticket type (decrease is prevented to avoid overselling issues).
     * 
     * @param Request $request
     * @param Event $event
     * @param TicketType $ticketType
     * @return RedirectResponse
     */
    public function updateQuantity(Request $request, Event $event, TicketType $ticketType): RedirectResponse
    {
        try {
            // Verify ticket type belongs to event
            if ($ticketType->event_id !== $event->id) {
                abort(404);
            }

            $request->validate([
                'additional_quantity' => 'required|integer|min:1|max:1000',
            ]);

            $additionalQuantity = $request->additional_quantity;
            $oldQuantity = $ticketType->quantity_available;

            // Increase available quantity
            $ticketType->increment('quantity_available', $additionalQuantity);

            // Log activity
            ActivityLogService::log('updated', $ticketType, 
                "Ticket type '{$ticketType->name}' quantity increased from {$oldQuantity} to {$ticketType->quantity_available}"
            );

            return redirect()
                ->back()
                ->with('success', "Ticket quantity increased by {$additionalQuantity} successfully!");

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Error updating ticket quantity: ' . $e->getMessage());
        }
    }
}
