<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Payment Model
 * 
 * This model tracks all payment transactions associated with bookings.
 * It supports multiple payment methods and provides a complete audit trail.
 * 
 * Relationships:
 * - belongsTo: Booking
 * - hasMany: Payment (for refunds)
 * - belongsTo: Payment (original payment for refunds)
 * 
 * Business Logic:
 * - Payment status lifecycle: pending -> successful -> failed
 * - Track payment method and gateway information
 * - Support refunds with reference to original payment
 */
class Payment extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     * 
     * @var array<int, string>
     */
    protected $fillable = [
        'amount',
        'currency',
        'status',
        'processor_response',
        'gateway_transaction_id',
        'payment_method',
        'gateway',
        'transaction_id',
        'gateway_response',
        'processed_at',
        'original_payment_id',
        'booking_id',
        'proof_image_path',
        'payment_reference',
        'sender_notes',
    ];

    /**
     * The attributes that should be cast.
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'processed_at' => 'datetime',
        'gateway_response' => 'array',
        'processor_response' => 'array',
    ];

    /**
     * The attributes that should be hidden for arrays.
     * 
     * @var array<int, string>
     */
    protected $hidden = [
        'gateway_response',
        'processor_response',
    ];

    /**
     * Get the booking this payment belongs to.
     * 
     * This relationship connects payments to their associated bookings,
     * ensuring proper payment tracking and booking management.
     */
    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    /**
     * Get the original payment for refunds.
     * 
     * This relationship connects refund payments to their original payments,
     * providing a complete refund trail.
     */
    public function originalPayment()
    {
        return $this->belongsTo(Payment::class, 'original_payment_id');
    }

    /**
     * Get refund payments for this payment.
     * 
     * This relationship tracks all refund payments associated with this
     * original payment.
     */
    public function refunds()
    {
        return $this->hasMany(Payment::class, 'original_payment_id');
    }

    /**
     * Check if the payment is successful.
     * 
     * This method determines if the payment was processed successfully.
     * 
     * @return bool
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'successful';
    }

    /**
     * Check if the payment is pending.
     * 
     * This method determines if the payment is awaiting processing.
     * 
     * @return bool
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if the payment failed.
     * 
     * This method determines if the payment processing failed.
     * 
     * @return bool
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * Check if this is a refund payment.
     * 
     * This method determines if this payment is a refund of an original payment.
     * 
     * @return bool
     */
    public function isRefund(): bool
    {
        return !is_null($this->original_payment_id);
    }

    /**
     * Check if the payment can be refunded.
     * 
     * This method determines if this payment can be refunded based on
     * its status and existing refunds.
     * 
     * @return bool
     */
    public function isRefundable(): bool
    {
        // Only successful payments can be refunded
        if (!$this->isSuccessful()) {
            return false;
        }

        // Check if this is not already a refund
        if ($this->isRefund()) {
            return false;
        }

        // Check if total refund amount doesn't exceed original amount
        $totalRefunded = $this->refunds()->where('status', 'successful')->sum('amount');
        return $totalRefunded < $this->amount;
    }

    /**
     * Get formatted amount.
     * 
     * This accessor provides a user-friendly formatted amount display.
     * 
     * @return string
     */
    public function getFormattedAmountAttribute(): string
    {
        return '$' . number_format($this->amount, 2);
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
            'successful' => 'green',
            'failed' => 'red',
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
            'pending' => 'Pending',
            'successful' => 'Successful',
            'failed' => 'Failed',
            'refunded' => 'Refunded',
            default => 'Unknown'
        };
    }

    /**
     * Get payment method display name.
     * 
     * This accessor provides user-friendly payment method names.
     * 
     * @return string
     */
    public function getPaymentMethodLabelAttribute(): string
    {
        return match($this->payment_method) {
            'credit_card' => 'Credit Card',
            'debit_card' => 'Debit Card',
            'paypal' => 'PayPal',
            'stripe' => 'Stripe',
            'bank_transfer' => 'Bank Transfer',
            default => ucfirst($this->payment_method)
        };
    }

    /**
     * Mark payment as successful.
     * 
     * This method updates the payment status and sets the processed timestamp.
     * 
     * @return bool
     */
    public function markAsSuccessful(): bool
    {
        $this->status = 'successful';
        $this->processed_at = now();
        return $this->save();
    }

    /**
     * Mark payment as failed.
     * 
     * This method updates the payment status and sets the processed timestamp.
     * 
     * @return bool
     */
    public function markAsFailed(): bool
    {
        $this->status = 'failed';
        $this->processed_at = now();
        return $this->save();
    }

    /**
     * Create a refund payment.
     * 
     * This method creates a refund payment for this original payment.
     * 
     * @param float $amount
     * @param string $method
     * @return Payment|null
     */
    public function createRefund(float $amount, string $method = 'refund'): ?Payment
    {
        if (!$this->isRefundable() || $amount > $this->getRefundableAmount()) {
            return null;
        }

        return $this->refunds()->create([
            'amount' => $amount,
            'currency' => $this->currency,
            'status' => 'pending',
            'payment_method' => $method,
            'gateway' => $this->gateway,
            'booking_id' => $this->booking_id,
        ]);
    }

    /**
     * Get the refundable amount.
     * 
     * This method calculates how much of this payment can still be refunded.
     * 
     * @return float
     */
    public function getRefundableAmount(): float
    {
        if (!$this->isSuccessful()) {
            return 0;
        }

        $totalRefunded = $this->refunds()->where('status', 'successful')->sum('amount');
        return $this->amount - $totalRefunded;
    }

    /**
     * Scope a query to only include successful payments.
     * 
     * This scope filters payments to show only successful transactions.
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'successful');
    }

    /**
     * Scope a query to only include pending payments.
     * 
     * This scope filters payments to show only pending transactions.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include failed payments.
     * 
     * This scope filters payments to show only failed transactions.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope a query to only include refund payments.
     * 
     * This scope filters payments to show only refund transactions.
     */
    public function scopeRefunds($query)
    {
        return $query->whereNotNull('original_payment_id');
    }

    /**
     * Scope a query to only include original payments (not refunds).
     * 
     * This scope filters payments to show only original transactions.
     */
    public function scopeOriginal($query)
    {
        return $query->whereNull('original_payment_id');
    }

    /**
     * Scope a query ordered by creation date.
     * 
     * This scope provides consistent ordering for payment displays.
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }
}
