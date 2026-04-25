<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreEventRequest;
use App\Http\Requests\Admin\UpdateEventRequest;
use App\Models\Event;
use App\Models\EventCategory;
use App\Services\ActivityLogService;
use App\Services\RefundPolicyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * Admin Event Controller
 * 
 * This controller handles all event management operations for administrators.
 * It includes CRUD operations, publishing, and event management features.
 * 
 * Business Logic:
 * - Admin-only access control
 * - Event creation with validation
 * - Image upload and management
 * - Event publishing and status management
 * - Activity logging for audit trail
 * - Database transactions for data integrity
 */
class EventController extends Controller
{
    /**
     * Display a listing of events.
     * 
     * This method shows all events with filtering and search capabilities.
     * Admins can view, search, and filter events for management.
     * 
     * @param Request $request
     * @return View
     */
    public function index(Request $request): View
    {
        $query = Event::with(['creator', 'categories'])
            ->withBookingStats();

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('venue', 'like', "%{$search}%");
            });
        }

        $events = $query->latest()->paginate(15);

        return view('admin.events.index', compact('events'));
    }

    /**
     * Show the form for creating a new event.
     * 
     * This method displays the event creation form with all necessary
     * data like categories for selection.
     * 
     * @return View
     */
    public function create(): View
    {
        $categories = EventCategory::active()->ordered()->get();
        
        return view('admin.events.create', compact('categories'));
    }

    /**
     * Store a newly created event in storage.
     * 
     * This method handles event creation with validation, image upload,
     * and category assignment. Uses database transactions for data integrity.
     * 
     * @param StoreEventRequest $request
     * @return RedirectResponse
     */
    public function store(StoreEventRequest $request): RedirectResponse
    {
        try {
            DB::beginTransaction();

            // Handle image upload
            $imageUrl = null;
            if ($request->hasFile('image')) {
                $image = $request->file('image');
                $imagePath = $image->store('events', 'public');
                $imageUrl = Storage::url($imagePath);
            }

            // Create event
            $event = Event::create([
                'title' => $request->title,
                'description' => $request->description,
                'venue' => $request->venue,
                'address' => $request->address,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'timezone' => $request->timezone,
                'max_capacity' => $request->max_capacity,
                'base_price' => $request->base_price,
                'status' => 'draft',
                'is_featured' => $request->boolean('is_featured'),
                'is_active' => true,
                'image_url' => $imageUrl,
                'created_by' => auth()->id(),
            ]);

            // Attach categories
            if ($request->filled('categories')) {
                $event->categories()->attach($request->categories);
            }

            // Log activity
            ActivityLogService::log('created', $event, "Event '{$event->title}' created");

            DB::commit();

            return redirect()
                ->route('admin.events.show', $event)
                ->with('success', 'Event created successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Error creating event: ' . $e->getMessage());
        }
    }

    /**
     * Display the specified event.
     * 
     * This method shows detailed event information including
     * ticket types, bookings, and statistics.
     * 
     * @param Event $event
     * @return View
     */
    public function show(Event $event): View
    {
        $event->load([
            'creator',
            'categories',
            'ticketTypes' => function ($query) {
                $query->withSalesStats();
            },
            'bookings' => function ($query) {
                $query->with('user')->latest()->limit(10);
            }
        ]);

        // Calculate statistics
        $stats = [
            'total_bookings' => $event->bookings()->count(),
            'confirmed_bookings' => $event->confirmedBookings()->count(),
            'total_revenue' => $event->total_revenue,
            'tickets_sold' => $event->total_tickets_sold,
            'available_capacity' => $event->available_capacity,
        ];

        return view('admin.events.show', compact('event', 'stats'));
    }

    /**
     * Show the form for editing the specified event.
     * 
     * This method displays the event edit form with current data
     * and available categories.
     * 
     * @param Event $event
     * @return View
     */
    public function edit(Event $event): View
    {
        $event->load('categories');
        $categories = EventCategory::active()->ordered()->get();
        
        return view('admin.events.edit', compact('event', 'categories'));
    }

    /**
     * Update the specified event in storage.
     * 
     * This method handles event updates with validation, image management,
     * and category updates. Uses database transactions for data integrity.
     * 
     * @param UpdateEventRequest $request
     * @param Event $event
     * @return RedirectResponse
     */
    public function update(UpdateEventRequest $request, Event $event): RedirectResponse
    {
        try {
            DB::beginTransaction();

            // Handle image upload
            $imageUrl = $event->image_url;
            if ($request->hasFile('image')) {
                // Delete old image
                if ($event->image_url) {
                    $oldImagePath = str_replace('/storage/', '', $event->image_url);
                    Storage::disk('public')->delete($oldImagePath);
                }

                // Upload new image
                $image = $request->file('image');
                $imagePath = $image->store('events', 'public');
                $imageUrl = Storage::url($imagePath);
            }

            // Store old values for activity log
            $oldValues = $event->only(['title', 'description', 'venue', 'address', 'start_time', 'end_time', 'max_capacity', 'base_price']);

            // Update event
            $event->update([
                'title' => $request->title,
                'description' => $request->description,
                'venue' => $request->venue,
                'address' => $request->address,
                'start_time' => $request->start_time,
                'end_time' => $request->end_time,
                'timezone' => $request->timezone,
                'max_capacity' => $request->max_capacity,
                'base_price' => $request->base_price,
                'is_featured' => $request->boolean('is_featured'),
                'image_url' => $imageUrl,
            ]);

            // Update categories
            if ($request->filled('categories')) {
                $event->categories()->sync($request->categories);
            } else {
                $event->categories()->detach();
            }

            // Log activity
            $newValues = $event->only(['title', 'description', 'venue', 'address', 'start_time', 'end_time', 'max_capacity', 'base_price']);
            ActivityLogService::log('updated', $event, "Event '{$event->title}' updated", $oldValues, $newValues);

            DB::commit();

            return redirect()
                ->route('admin.events.show', $event)
                ->with('success', 'Event updated successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            
            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'Error updating event: ' . $e->getMessage());
        }
    }

    /**
     * Remove the specified event from storage.
     * 
     * This method handles event deletion with proper validation
     * to prevent deletion of events with bookings.
     * 
     * @param Event $event
     * @return RedirectResponse
     */
    public function destroy(Event $event): RedirectResponse
    {
        try {
            // Check if event has bookings
            if ($event->bookings()->exists()) {
                return redirect()
                    ->back()
                    ->with('error', 'Cannot delete event with existing bookings.');
            }

            // Check if event is upcoming
            if ($event->isUpcoming()) {
                return redirect()
                    ->back()
                    ->with('error', 'Cannot delete upcoming events. Cancel the event instead.');
            }

            DB::beginTransaction();

            // Delete image
            if ($event->image_url) {
                $imagePath = str_replace('/storage/', '', $event->image_url);
                Storage::disk('public')->delete($imagePath);
            }

            $eventTitle = $event->title;
            $event->delete();

            // Log activity
            ActivityLogService::log('deleted', $event, "Event '{$eventTitle}' deleted");

            DB::commit();

            return redirect()
                ->route('admin.events.index')
                ->with('success', 'Event deleted successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            
            return redirect()
                ->back()
                ->with('error', 'Error deleting event: ' . $e->getMessage());
        }
    }

    /**
     * Publish the specified event.
     * 
     * This method changes event status to published, making it
     * available for customer bookings.
     * 
     * @param Event $event
     * @return RedirectResponse
     */
    public function publish(Event $event): RedirectResponse
    {
        try {
            if ($event->status !== 'draft') {
                return redirect()
                    ->back()
                    ->with('error', 'Only draft events can be published.');
            }

            if (!$event->ticketTypes()->exists()) {
                return redirect()
                    ->back()
                    ->with('error', 'Event must have at least one ticket type before publishing.');
            }

            $event->update(['status' => 'published']);

            // Log activity
            ActivityLogService::log('published', $event, "Event '{$event->title}' published");

            return redirect()
                ->back()
                ->with('success', 'Event published successfully!');

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Error publishing event: ' . $e->getMessage());
        }
    }

    /**     * Reschedule the event to a new date and time.
     * 
     * This method moves an event's schedule and notifies customers.
     * Customers are given a dedicated window to decide if they want to
     * keep the ticket for the new date or request a refund.
     * 
     * @param Request $request
     * @param Event $event
     * @return RedirectResponse
     */
    public function reschedule(Request $request, Event $event): RedirectResponse
    {
        $request->validate([
            'new_start_time' => 'required|date|after:now',
            'new_end_time' => 'required|date|after:new_start_time',
            'refund_deadline_hours' => 'required|integer|min:24|max:168', // Allow 24h to 7 days
        ]);

        try {
            DB::beginTransaction();

            // Store original time for history if not already set
            $originalStartTime = $event->original_start_time ?? $event->start_time;
            
            // Calculate refund deadline
            $refundDeadline = now()->addHours((int)$request->refund_deadline_hours);

            // Update event times
            $event->update([
                'start_time' => $request->new_start_time,
                'end_time' => $request->new_end_time,
                'original_start_time' => $originalStartTime,
                'rescheduled_at' => now(),
                'status' => 'rescheduled',
                'refund_deadline' => $refundDeadline,
            ]);

            // Set all confirmed bookings to 'pending' response status
            // This triggers the customer choice UI
            $event->confirmedBookings()->update([
                'reschedule_response' => 'pending'
            ]);

            // Log activity
            ActivityLogService::log('rescheduled', $event, "Event '{$event->title}' moved from {$originalStartTime} to {$request->new_start_time}. Refund window closes at {$refundDeadline}.");

            DB::commit();

            return redirect()
                ->back()
                ->with('success', "Event rescheduled successfully! All ticket holders are now in the 'Decision Period' until {$refundDeadline}.");

        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()
                ->back()
                ->with('error', 'Error rescheduling event: ' . $e->getMessage());
        }
    }

    /**     * Cancel the specified event.
     * 
     * This method cancels an event and handles refund processing
     * for existing bookings.
     * 
     * @param Event $event
     * @return RedirectResponse
     */
    public function cancel(Event $event): RedirectResponse
    {
        try {
            if ($event->status === 'cancelled') {
                return redirect()
                    ->back()
                    ->with('error', 'Event is already cancelled.');
            }

            if ($event->status === 'completed') {
                return redirect()
                    ->back()
                    ->with('error', 'Cannot cancel completed events.');
            }

            DB::beginTransaction();

            // Cancel all confirmed bookings
            $confirmedBookings = $event->confirmedBookings();
            $bookingCount = $confirmedBookings->count();

            foreach ($confirmedBookings->get() as $booking) {
                // Keep refund state transitions centralized in policy service.
                RefundPolicyService::approveToLedger(
                    $booking,
                    'AUTOMATIC REFUND: Event cancelled by Organizer',
                    auth()->id(),
                    'original_source'
                );
            }

            $event->update(['status' => 'cancelled']);

            // Log activity
            ActivityLogService::log('cancelled', $event, "Event '{$event->title}' cancelled. {$bookingCount} bookings affected.");

            DB::commit();

            return redirect()
                ->back()
                ->with('success', "Event cancelled successfully! {$bookingCount} bookings will be refunded.");

        } catch (\Exception $e) {
            DB::rollBack();
            
            return redirect()
                ->back()
                ->with('error', 'Error cancelling event: ' . $e->getMessage());
        }
    }

    /**
     * Toggle event active status.
     * 
     * This method enables or disables an event for booking
     * without changing its status.
     * 
     * @param Event $event
     * @return RedirectResponse
     */
    public function toggleActive(Event $event): RedirectResponse
    {
        try {
            $event->update(['is_active' => !$event->is_active]);
            $status = $event->is_active ? 'activated' : 'deactivated';

            // Log activity
            ActivityLogService::log($status, $event, "Event '{$event->title}' {$status}");

            return redirect()
                ->back()
                ->with('success', "Event {$status} successfully!");

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Error updating event status: ' . $e->getMessage());
        }
    }
}
