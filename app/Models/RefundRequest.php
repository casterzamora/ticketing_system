<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * RefundRequest Model
 * 
 * This model manages customer refund requests created when an organizer 
 * cancels their event.
 * 
 * Relationships:
 * - belongsTo: Booking, User (approved_by)
 * 
 * Business Logic:
 * - Refunds are automatically processed when the event organizer cancels the event.
 * - Only one refund request per booking.
 * - Progress status: pending -> approved -> rejected.
 */
class RefundRequest extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     * 
     * @var array<int, string>
     */
    protected $fillable = [
        'refund_amount',
        'reason',
        'admin_notes',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'processed_at',
        'refund_method',
        'refund_reference',
        'booking_id',
    ];

    /**
     * The attributes that should be cast.
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'refund_amount' => 'decimal:2',
        'approved_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    /**
     * Get the booking this refund request belongs to.
     * 
     * This relationship connects refund requests to their associated bookings,
     * ensuring proper refund management and data integrity.
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Get the admin who approved/rejected this refund.
     * 
     * This relationship tracks which admin handled the refund request
     * for accountability and audit purposes.
     */
    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Check if the refund request is pending.
     * 
     * This method determines if the refund request is awaiting approval.
     * 
     * @return bool
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if the refund request is approved.
     * 
     * This method determines if the refund request has been approved.
     * 
     * @return bool
     */
    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /**
     * Check if the refund request is rejected.
     * 
     * This method determines if the refund request has been rejected.
     * 
     * @return bool
     */
    public function isRejected(): bool
    {
        return $this->status === 'rejected';
    }

    /**
     * Check if the refund request is processed.
     * 
     * This method determines if the refund request has been processed
     * (approved or rejected).
     * 
     * @return bool
     */
    public function isProcessed(): bool
    {
        return $this->isApproved() || $this->isRejected();
    }

    /**
     * Check if the refund request can be approved.
     * 
     * This method determines if the refund request meets all criteria
     * for approval based on business rules.
     * 
     * @return bool
     */
    public function canBeApproved(): bool
    {
        // Must be pending
        if (!$this->isPending()) {
            return false;
        }

        // Refund amount must not exceed booking total
        if ($this->refund_amount > $this->booking->total_amount) {
            return false;
        }

        // Admin Override: If an admin explicitly tries to approve, 
        // they can override the default non-refundable policy.
        // We check if the user is an admin.
        if (auth()->check() && auth()->user()->isAdmin()) {
            return true;
        }

        // Standard logic for non-admin requests or automated checks
        return $this->booking->isRefundable();
    }

    /**
     * Get formatted refund amount.
     * 
     * This accessor provides a user-friendly formatted amount display.
     * 
     * @return string
     */
    public function getFormattedRefundAmountAttribute(): string
    {
        return '$' . number_format($this->refund_amount, 2);
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
            'approved' => 'green',
            'rejected' => 'red',
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
            'pending' => 'Pending Approval',
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            default => 'Unknown'
        };
    }

    /**
     * Approve the refund request.
     * 
     * This method approves the refund request and updates the booking status.
     * It includes all necessary business logic for refund processing.
     * 
     * @param int $adminId
     * @param string $refundMethod
     * @return bool
     */
    public function approve(int $adminId, string $refundMethod = 'original'): bool
    {
        if (!$this->canBeApproved()) {
            return false;
        }

        // Update refund request
        $this->status = 'approved';
        $this->approved_by = $adminId;
        $this->approved_at = now();
        $this->processed_at = now();
        $this->refund_method = $refundMethod;

        if (!$this->save()) {
            return false;
        }

        // Update booking status to refunded
        $this->booking->status = 'refunded';
        if (!$this->booking->save()) {
            return false;
        }

        // Release ticket quantities back to inventory
        foreach ($this->booking->bookingTickets as $bookingTicket) {
            $bookingTicket->ticketType->decreaseSoldQuantity($bookingTicket->quantity);
        }

        // Create refund payment record
        $originalPayment = $this->booking->successfulPayment();
        if ($originalPayment) {
            $refundPayment = $originalPayment->createRefund(
                $this->refund_amount, 
                $refundMethod
            );
            
            if ($refundPayment) {
                $refundPayment->markAsSuccessful();
                $this->refund_reference = $refundPayment->id;
                $this->save();
            }
        }

        return true;
    }

    /**
     * Reject the refund request.
     * 
     * This method rejects the refund request with a reason.
     * 
     * @param int $adminId
     * @param string $rejectionReason
     * @return bool
     */
    public function reject(int $adminId, string $rejectionReason = ''): bool
    {
        if (!$this->isPending()) {
            return false;
        }

        $this->status = 'rejected';
        $this->approved_by = $adminId;
        $this->approved_at = now();
        $this->processed_at = now();
        $this->rejection_reason = $rejectionReason;

        return $this->save();
    }

    /**
     * Scope a query to only include pending refund requests.
     * 
     * This scope filters refund requests to show only those awaiting approval.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include approved refund requests.
     * 
     * This scope filters refund requests to show only those that are approved.
     */
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /**
     * Scope a query to only include rejected refund requests.
     * 
     * This scope filters refund requests to show only those that are rejected.
     */
    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    /**
     * Scope a query ordered by creation date.
     * 
     * This scope provides consistent ordering for refund request displays.
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Scope a query for a specific booking.
     * 
     * This scope filters refund requests by their associated booking.
     */
    public function scopeForBooking($query, $bookingId)
    {
        return $query->where('booking_id', $bookingId);
    }
}
