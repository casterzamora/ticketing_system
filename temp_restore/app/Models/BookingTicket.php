<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * BookingTicket Model
 * 
 * This model represents individual ticket purchases within bookings.
 * It's a pivot table that tracks quantity and pricing for each
 * ticket type purchased in a booking.
 * 
 * Relationships:
 * - belongsTo: Booking, TicketType
 * 
 * Business Logic:
 * - Track quantity and pricing at time of booking
 * - Ensure data integrity with foreign key constraints
 * - Prevent duplicate entries per booking
 */
class BookingTicket extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     * 
     * @var array<int, string>
     */
    protected $fillable = [
        'quantity',
        'price_per_ticket',
        'total_price',
        'booking_id',
        'ticket_type_id',
    ];

    /**
     * The attributes that should be cast.
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'quantity' => 'integer',
        'price_per_ticket' => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

    /**
     * Disable timestamps for this pivot table.
     * 
     * @var bool
     */
    public $timestamps = true;

    /**
     * Get the booking this ticket belongs to.
     * 
     * This relationship connects booking tickets to their parent bookings,
     * ensuring proper booking management and data integrity.
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Get the ticket type for this booking ticket.
     * 
     * This relationship connects booking tickets to their ticket types,
     * providing access to ticket type information and pricing.
     */
    public function ticketType()
    {
        return $this->belongsTo(TicketType::class);
    }

    /**
     * Get formatted price per ticket.
     * 
     * This accessor provides a user-friendly formatted price display.
     * 
     * @return string
     */
    public function getFormattedPricePerTicketAttribute(): string
    {
        return '$' . number_format($this->price_per_ticket, 2);
    }

    /**
     * Get formatted total price.
     * 
     * This accessor provides a user-friendly formatted total price display.
     * 
     * @return string
     */
    public function getFormattedTotalPriceAttribute(): string
    {
        return '$' . number_format($this->total_price, 2);
    }

    /**
     * Scope a query ordered by ticket type name.
     * 
     * This scope provides consistent ordering for booking ticket displays.
     */
    public function scopeOrderByTicketType($query)
    {
        return $query->join('ticket_types', 'booking_tickets.ticket_type_id', '=', 'ticket_types.id')
            ->orderBy('ticket_types.name');
    }

    /**
     * Scope a query for a specific booking.
     * 
     * This scope filters booking tickets by their parent booking.
     */
    public function scopeForBooking($query, $bookingId)
    {
        return $query->where('booking_id', $bookingId);
    }

    /**
     * Scope a query for a specific ticket type.
     * 
     * This scope filters booking tickets by their ticket type.
     */
    public function scopeForTicketType($query, $ticketTypeId)
    {
        return $query->where('ticket_type_id', $ticketTypeId);
    }
}
