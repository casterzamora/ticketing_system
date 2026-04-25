<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Booking Model
 * 
 * This model represents customer bookings for events. Bookings are the
 * core transaction entity that connects users, events, and tickets.
 * 
 * Relationships:
 * - belongsTo: User, Event
 * - hasMany: BookingTicket, Payment, RefundRequest
 * - belongsToMany: TicketType (through booking_tickets)
 * 
 * Business Logic:
 * - Booking status lifecycle: pending -> confirmed -> cancelled -> refunded
 * - Prevent double booking for the same user and event
 * - Track customer information and special requirements
 * - Support refund eligibility checks
 */
class Booking extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     * 
     * @var array<int, string>
     */
    protected $fillable = [
        'booking_reference',
        'total_tickets',
        'total_amount',
        'status',
        'customer_name',
        'customer_email',
        'customer_phone',
        'special_requirements',
        'user_id',
        'event_id',
        'reschedule_response',
        'responded_at',
        'void_type',
        'void_reason',
        'expires_at',
        'paid_at',
        'external_session_id',
        'checked_in_at',
    ];

    /**
     * The attributes that should be cast.
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'total_amount' => 'decimal:2',
        'total_tickets' => 'integer',
        'responded_at' => 'datetime',
        'checked_in_at' => 'datetime',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    /**
     * The attributes that should be hidden for arrays.
     * 
     * @var array<int, string>
     */
    protected $hidden = [
        'special_requirements',
    ];

    /**
     * Get the user who made this booking.
     * 
     * This relationship connects bookings to the users who made them,
     * providing accountability and user management capabilities.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the event this booking is for.
     * 
     * This relationship connects bookings to their associated events,
     * ensuring data integrity and proper event management.
     */
    public function event()
    {
        return $this->belongsTo(Event::class);
    }

    /**
     * Get the booking tickets for this booking.
     * 
     * This relationship tracks all individual ticket purchases
     * within this booking.
     */
    public function bookingTickets()
    {
        return $this->hasMany(BookingTicket::class);
    }

    /**
     * Get individual issued tickets for this booking.
     */
    public function tickets()
    {
        return $this->hasMany(Ticket::class);
    }

    /**
     * Get the payments for this booking.
     * 
     * This relationship tracks all payment attempts for this booking,
     * including successful, failed, and refunded payments.
     */
    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get the refund request for this booking.
     * 
     * This relationship tracks refund requests associated with this booking.
     * Only one refund request is allowed per booking.
     */
    public function refundRequest()
    {
        return $this->hasOne(RefundRequest::class);
    }

    /**
     * Get the ticket types for this booking.
     * 
     * This many-to-many relationship provides access to the ticket
     * types purchased in this booking through the pivot table.
     */
    public function ticketTypes()
    {
        return $this->belongsToMany(TicketType::class, 'booking_tickets')
            ->withPivot(['quantity', 'price_per_ticket', 'total_price']);
    }

    /**
     * Get the successful payment for this booking.
     * 
     * This relationship retrieves the successful payment associated
     * with this booking for payment status tracking.
     */
    public function successfulPayment()
    {
        return $this->payments()->where('status', 'successful')->first();
    }

    /**
     * Check if the booking is confirmed.
     * 
     * This method determines if the booking has been confirmed
     * and is valid for attendance.
     * 
     * @return bool
     */
    public function isConfirmed(): bool
    {
        return $this->status === 'confirmed';
    }

    /**
     * Check if the booking is pending.
     * 
     * This method determines if the booking is awaiting payment
     * or confirmation.
     * 
     * @return bool
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if the booking is cancelled.
     * 
     * This method determines if the booking has been cancelled.
     * 
     * @return bool
     */
    public function isCancelled(): bool
    {
        return $this->status === 'cancelled';
    }

    /**
     * Check if the booking is refunded.
     * 
     * This method determines if the booking has been refunded.
     * 
     * @return bool
     */
    public function isRefunded(): bool
    {
        return $this->status === 'refunded';
    }

    /**
     * Check if the booking is eligible for refund.
     * 
     * Middleman Policy:
     * - Only eligible for refund if the event is officially CANCELLED.
     */
    public function isRefundable(): bool
    {
        // Booking must be confirmed and event MUST be cancelled
        return $this->isConfirmed() && 
               $this->event->status === 'cancelled' && 
               !$this->refundRequest;
    }

    /**
     * Check if the booking can be cancelled.
     * 
     * This method determines if the booking can be cancelled based on
     * its current status and event timing.
     * 
     * @return bool
     */
    public function isCancellable(): bool
    {
        // Can't cancel if already cancelled or refunded
        if ($this->isCancelled() || $this->isRefunded()) {
            return false;
        }

        // Can cancel pending or confirmed bookings
        return $this->isPending() || $this->isConfirmed();
    }

    /**
     * Get formatted total amount.
     * 
     * This accessor provides a user-friendly formatted amount display.
     * 
     * @return string
     */
    public function getFormattedTotalAmountAttribute(): string
    {
        return '$' . number_format($this->total_amount, 2);
    }

    /**
     * Get status badge color.
     * 
     * This accessor provides appropriate color coding for status displays.
     * 
     * @return string
     */
    public function getStatusBadgeColorAttribute(): string
    {
        return match($this->status) {
            'pending' => 'yellow',
            'confirmed' => 'green',
            'cancelled' => 'red',
            'refunded' => 'gray',
            default => 'gray'
        };
    }

    /**
     * Get human-readable status label.
     * 
     * This accessor provides user-friendly status labels.
     * 
     * @return string
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'pending' => 'Pending Payment',
            'confirmed' => 'Confirmed',
            'cancelled' => 'Cancelled',
            'refunded' => 'Refunded',
            default => 'Unknown'
        };
    }

    /**
     * Confirm the booking.
     * 
     * This method changes the booking status to confirmed and
     * triggers any necessary business logic.
     * 
     * @return bool
     */
    public function confirm(): bool
    {
        if ($this->status !== 'pending') {
            return false;
        }

        $this->status = 'confirmed';
        return $this->save();
    }

    /**
     * Cancel the booking.
     * 
     * This method changes the booking status to cancelled and
     * releases ticket quantities back to inventory.
     * 
     * @return bool
     */
    public function cancel(): bool
    {
        if (!$this->isCancellable()) {
            return false;
        }

        // Release ticket quantities
        foreach ($this->bookingTickets as $bookingTicket) {
            $bookingTicket->ticketType->decreaseSoldQuantity($bookingTicket->quantity);
        }

        $this->status = 'cancelled';
        return $this->save();
    }

    /**
     * Scope a query to only include pending bookings.
     * 
     * This scope filters bookings to show only those awaiting payment.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include confirmed bookings.
     * 
     * This scope filters bookings to show only those that are confirmed.
     */
    public function scopeConfirmed($query)
    {
        return $query->where('status', 'confirmed');
    }

    /**
     * Scope a query to only include cancelled bookings.
     * 
     * This scope filters bookings to show only those that are cancelled.
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Scope a query to only include refunded bookings.
     * 
     * This scope filters bookings to show only those that are refunded.
     */
    public function scopeRefunded($query)
    {
        return $query->where('status', 'refunded');
    }

    /**
     * Scope a query to only include refundable bookings.
     * 
     * This scope filters bookings to show only those eligible for refund.
     */
    public function scopeRefundable($query)
    {
        return $query->confirmed()
            ->whereHas('event', function ($eventQuery) {
                $eventQuery->where('start_time', '>', Carbon::now()->addHours(48));
            })
            ->whereDoesntHave('refundRequest');
    }

    /**
     * Scope a query ordered by creation date.
     * 
     * This scope provides consistent ordering for booking displays.
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }
}
