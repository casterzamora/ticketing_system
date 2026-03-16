<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * TicketType Model
 * 
 * This model represents different ticket types for events such as
 * VIP, General Admission, Student, etc. Each event can have multiple
 * ticket types with different pricing and availability.
 * 
 * Relationships:
 * - belongsTo: Event
 * - hasMany: BookingTicket
 * 
 * Business Logic:
 * - Track available vs sold quantities
 * - Prevent overselling through quantity management
 * - Support activation/deactivation of ticket types
 */
class TicketType extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     * 
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'description',
        'price',
        'quantity_available',
        'quantity_sold',
        'is_active',
        'event_id',
    ];

    /**
     * The attributes that should be cast.
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'price' => 'decimal:2',
        'quantity_available' => 'integer',
        'quantity_sold' => 'integer',
        'is_active' => 'boolean',
    ];

    /**
     * Get the event this ticket type belongs to.
     * 
     * This relationship connects ticket types to their parent events,
     * ensuring data integrity and proper event management.
     */
    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Get the booking tickets for this ticket type.
     * 
     * This relationship tracks all individual ticket purchases
     * of this specific ticket type.
     */
    public function bookingTickets()
    {
        return $this->hasMany(BookingTicket::class);
    }

    /**
     * Get the available quantity for this ticket type.
     * 
     * This accessor calculates the remaining tickets available
     * for purchase based on total available minus sold.
     * 
     * @return int
     */
    public function getAvailableQuantityAttribute(): int
    {
        return $this->quantity_available - $this->quantity_sold;
    }

    /**
     * Check if this ticket type is sold out.
     * 
     * This method determines if all tickets of this type have been sold.
     * 
     * @return bool
     */
    public function isSoldOut(): bool
    {
        return $this->available_quantity <= 0;
    }

    /**
     * Check if this ticket type is available for purchase.
     * 
     * This method combines multiple conditions to determine if
     * tickets can be purchased.
     * 
     * @return bool
     */
    public function isAvailable(): bool
    {
        return $this->is_active && 
               !$this->isSoldOut() && 
               $this->event->isBookable();
    }

    /**
     * Get the sold percentage for this ticket type.
     * 
     * This accessor calculates what percentage of tickets have been sold,
     * useful for progress indicators and reporting.
     * 
     * @return float
     */
    public function getSoldPercentageAttribute(): float
    {
        if ($this->quantity_available == 0) {
            return 0;
        }

        return ($this->quantity_sold / $this->quantity_available) * 100;
    }

    /**
     * Get formatted price.
     * 
     * This accessor provides a user-friendly formatted price display.
     * 
     * @return string
     */
    public function getFormattedPriceAttribute(): string
    {
        return '$' . number_format($this->price, 2);
    }

    /**
     * Increase the sold quantity.
     * 
     * This method safely increments the sold quantity when tickets are purchased.
     * It includes validation to prevent overselling.
     * 
     * @param int $quantity
     * @return bool
     */
    public function increaseSoldQuantity(int $quantity): bool
    {
        // Validate that we have enough tickets available
        if ($this->available_quantity < $quantity) {
            return false;
        }

        $this->quantity_sold += $quantity;
        return $this->save();
    }

    /**
     * Decrease the sold quantity.
     * 
     * This method safely decrements the sold quantity when bookings are cancelled
     * or refunded. It prevents negative quantities.
     * 
     * @param int $quantity
     * @return bool
     */
    public function decreaseSoldQuantity(int $quantity): bool
    {
        // Validate that we don't go below zero
        if ($this->quantity_sold < $quantity) {
            return false;
        }

        $this->quantity_sold -= $quantity;
        return $this->save();
    }

    /**
     * Scope a query to only include active ticket types.
     * 
     * This scope filters ticket types to show only those that are
     * available for purchase.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include available ticket types.
     * 
     * This scope filters ticket types to show only those that have
     * tickets available for purchase.
     */
    public function scopeAvailable($query)
    {
        return $query->active()
            ->whereRaw('quantity_sold < quantity_available');
    }

    /**
     * Scope a query to only include sold out ticket types.
     * 
     * This scope filters ticket types to show only those that have
     * sold all available tickets.
     */
    public function scopeSoldOut($query)
    {
        return $query->whereRaw('quantity_sold >= quantity_available');
    }

    /**
     * Scope a query ordered by price.
     * 
     * This scope provides ordering by price for customer displays.
     */
    public function scopeOrderByPrice($query, $direction = 'asc')
    {
        return $query->orderBy('price', $direction);
    }

    /**
     * Scope a query to include sales statistics.
     * 
     * This scope adds sales statistics for efficient dashboard queries.
     */
    public function scopeWithSalesStats($query)
    {
        return $query->withCount(['bookingTickets as total_bookings'])
            ->withSum(['bookingTickets as total_revenue'], 'total_price');
    }
}
