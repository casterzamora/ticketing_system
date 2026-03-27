<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Event Model
 * 
 * This model represents events in the ticketing system. Events are the core
 * entity that users can book tickets for. Each event can have multiple ticket
 * types and belongs to various categories.
 * 
 * Relationships:
 * - belongsTo: User (creator)
 * - hasMany: TicketType, Booking
 * - belongsToMany: EventCategory
 * - hasManyThrough: BookingTicket
 * 
 * Business Logic:
 * - Prevent booking if event is cancelled or completed
 * - Check if event is upcoming for refund eligibility
 * - Calculate total tickets sold and revenue
 */
class Event extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     * 
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'description',
        'venue',
        'address',
        'start_time',
        'end_time',
        'timezone',
        'max_capacity',
        'base_price',
        'status',
        'is_featured',
        'is_active',
        'image_url',
        'video_url',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'base_price' => 'decimal:2',
        'max_capacity' => 'integer',
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * Get the user who created the event.
     * 
     * This relationship exists to track which admin created the event
     * for accountability and management purposes.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the ticket types for this event.
     * 
     * This relationship allows events to have multiple ticket categories
     * (VIP, General Admission, etc.) with different pricing.
     */
    public function ticketTypes()
    {
        return $this->hasMany(TicketType::class);
    }

    /**
     * Get the bookings for this event.
     * 
     * This relationship tracks all customer bookings for this event.
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Get the categories for this event.
     * 
     * This many-to-many relationship allows events to be categorized
     * for better organization and filtering.
     */
    public function categories()
    {
        return $this->belongsToMany(EventCategory::class, 'event_category_event');
    }

    /**
     * Get the booking tickets through bookings.
     * 
     * This has-many-through relationship provides access to all individual
     * ticket purchases for this event.
     */
    public function bookingTickets()
    {
        return $this->hasManyThrough(BookingTicket::class, Booking::class);
    }

    /**
     * Get active ticket types only.
     * 
     * This scope filters to only show ticket types that are available for purchase.
     */
    public function activeTicketTypes()
    {
        return $this->ticketTypes()->where('is_active', true);
    }

    /**
     * Get confirmed bookings only.
     * 
     * This scope filters to only show bookings that have been confirmed
     * for revenue and attendance calculations.
     */
    public function confirmedBookings()
    {
        return $this->bookings()->where('status', 'confirmed');
    }

    /**
     * Check if the event is upcoming.
     * 
     * This method determines if the event has not yet started,
     * which is important for booking and refund eligibility.
     * 
     * @return bool
     */
    public function isUpcoming(): bool
    {
        return $this->start_time->isFuture();
    }

    /**
     * Check if the event is in the past.
     * 
     * This method determines if the event has already ended,
     * which affects booking availability and refund policies.
     * 
     * @return bool
     */
    public function isPast(): bool
    {
        return $this->end_time->isPast();
    }

    /**
     * Check if the event is currently active.
     * 
     * This method combines multiple conditions to determine if
     * the event can be booked.
     * 
     * @return bool
     */
    public function isBookable(): bool
    {
        return $this->is_active && 
               $this->status === 'published' && 
               $this->isUpcoming();
    }

    /**
     * Check if the event is at least 72 hours away (industry standard).
     * 
     * This method is used for refund eligibility according to business rules.
     * 
     * @return bool
     */
    public function isMoreThan72HoursAway(): bool
    {
        return $this->start_time->diffInHours(\Carbon\Carbon::now()) >= 72;
    }

    /**
     * Get total tickets sold for this event.
     * 
     * This method calculates the total number of tickets sold across
     * all confirmed bookings for revenue and capacity tracking.
     * 
     * @return int
     */
    public function getTotalTicketsSoldAttribute(): int
    {
        return $this->confirmedBookings()->sum('total_tickets');
    }

    /**
     * Get total revenue for this event.
     * 
     * This method calculates the total revenue from all confirmed bookings.
     * 
     * @return float
     */
    public function getTotalRevenueAttribute(): float
    {
        return $this->confirmedBookings()->sum('total_amount');
    }

    /**
     * Get available capacity for this event.
     * 
     * This method calculates remaining capacity based on max capacity
     * and tickets already sold.
     * 
     * @return int
     */
    public function getAvailableCapacityAttribute(): int
    {
        return $this->max_capacity - $this->total_tickets_sold;
    }

    /**
     * Check if the event is sold out.
     * 
     * This method determines if all available tickets have been sold.
     * 
     * @return bool
     */
    public function isSoldOut(): bool
    {
        return $this->available_capacity <= 0;
    }

    /**
     * Get formatted start time.
     * 
     * This accessor provides a user-friendly formatted start time.
     * 
     * @return string
     */
    public function getFormattedStartTimeAttribute(): string
    {
        return $this->start_time->format('M j, Y \a\t g:i A');
    }

    /**
     * Get formatted end time.
     * 
     * This accessor provides a user-friendly formatted end time.
     * 
     * @return string
     */
    public function getFormattedEndTimeAttribute(): string
    {
        return $this->end_time->format('M j, Y \a\t g:i A');
    }

    /**
     * Scope a query to only include upcoming events.
     * 
     * This scope filters events to show only those that haven't started yet.
     */
    public function scopeUpcoming($query)
    {
        return $query->where('start_time', '>', Carbon::now());
    }

    /**
     * Scope a query to only include published events.
     * 
     * This scope filters events to show only those that are published
     * and visible to customers.
     */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /**
     * Scope a query to only include active events.
     * 
     * This scope filters events to show only those that are active
     * and available for booking.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include featured events.
     * 
     * This scope filters events to show only those marked as featured
     * for homepage display.
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    /**
     * Scope a query to include booking statistics.
     * 
     * This scope adds booking statistics to the query for efficient
     * dashboard and reporting queries.
     */
    public function scopeWithBookingStats($query)
    {
        return $query->withCount([
            'bookings as total_bookings',
            'bookings as confirmed_bookings' => function ($query) {
                $query->where('status', 'confirmed');
            }
        ])->withSum(['bookings as total_revenue' => function ($query) {
            $query->where('status', 'confirmed');
        }], 'total_amount');
    }
}
