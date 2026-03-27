<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * ActivityLog Model
 * 
 * This model tracks all important system actions for audit purposes
 * and user activity monitoring. It provides a complete audit trail
 * of critical operations in the system.
 * 
 * Relationships:
 * - belongsTo: User
 * - morphTo: Subject (polymorphic relationship)
 * 
 * Business Logic:
 * - Log all critical actions (bookings, payments, refunds)
 * - Track user who performed the action
 * - Store old and new values for change tracking
 * - Support IP address and user agent tracking
 */
class ActivityLog extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     * 
     * @var array<int, string>
     */
    protected $fillable = [
        'action',
        'subject_type',
        'subject_id',
        'description',
        'user_id',
        'ip_address',
        'user_agent',
        'old_values',
        'new_values',
    ];

    /**
     * The attributes that should be cast.
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    /**
     * The attributes that should be hidden for arrays.
     * 
     * @var array<int, string>
     */
    protected $hidden = [
        'user_agent',
    ];

    /**
     * Get the user who performed the action.
     * 
     * This relationship connects activity logs to the users who performed
     * the actions, providing accountability and audit capabilities.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the subject of the activity.
     * 
     * This polymorphic relationship allows the activity log to track
     * actions on any model type (bookings, payments, events, etc.).
     */
    public function subject()
    {
        return $this->morphTo();
    }

    /**
     * Get formatted description.
     * 
     * This accessor provides a formatted description if none is set,
     * using the action and subject information.
     * 
     * @return string
     */
    public function getFormattedDescriptionAttribute(): string
    {
        if ($this->description) {
            return $this->description;
        }

        $subjectType = class_basename($this->subject_type);
        $action = ucfirst($this->action);
        
        return "{$action} {$subjectType} #{$this->subject_id}";
    }

    /**
     * Get action badge color.
     * 
     * This accessor provides appropriate color coding for action displays.
     * 
     * @return string
     */
    public function getActionBadgeColorAttribute(): string
    {
        return match($this->action) {
            'created' => 'green',
            'updated' => 'blue',
            'deleted' => 'red',
            'cancelled' => 'red',
            'refunded' => 'yellow',
            'confirmed' => 'green',
            'approved' => 'green',
            'rejected' => 'red',
            default => 'gray'
        };
    }

    /**
     * Log an activity.
     * 
     * This static method provides a convenient way to log activities
     * with automatic user detection and IP address tracking.
     * 
     * @param string $action
     * @param Model $subject
     * @param string|null $description
     * @param array|null $oldValues
     * @param array|null $newValues
     * @return static
     */
    public static function log(
        string $action, 
        Model $subject, 
        ?string $description = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): static {
        return static::create([
            'action' => $action,
            'subject_type' => get_class($subject),
            'subject_id' => $subject->getKey(),
            'description' => $description,
            'user_id' => auth()->id(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'old_values' => $oldValues,
            'new_values' => $newValues,
        ]);
    }

    /**
     * Log a booking activity.
     * 
     * This static method provides a specialized way to log booking-related
     * activities with appropriate descriptions.
     * 
     * @param string $action
     * @param Booking $booking
     * @param string|null $customDescription
     * @return static
     */
    public static function logBooking(
        string $action, 
        Booking $booking, 
        ?string $customDescription = null
    ): static {
        $description = $customDescription ?? match($action) {
            'created' => "Booking #{$booking->booking_reference} created",
            'confirmed' => "Booking #{$booking->booking_reference} confirmed",
            'cancelled' => "Booking #{$booking->booking_reference} cancelled",
            'refunded' => "Booking #{$booking->booking_reference} refunded",
            default => "Booking #{$booking->booking_reference} {$action}"
        };

        return static::log($action, $booking, $description);
    }

    /**
     * Log a payment activity.
     * 
     * This static method provides a specialized way to log payment-related
     * activities with appropriate descriptions.
     * 
     * @param string $action
     * @param Payment $payment
     * @param string|null $customDescription
     * @return static
     */
    public static function logPayment(
        string $action, 
        Payment $payment, 
        ?string $customDescription = null
    ): static {
        $description = $customDescription ?? match($action) {
            'created' => "Payment of {$payment->formatted_amount} initiated",
            'successful' => "Payment of {$payment->formatted_amount} successful",
            'failed' => "Payment of {$payment->formatted_amount} failed",
            'refunded' => "Refund of {$payment->formatted_amount} processed",
            default => "Payment {$action}: {$payment->formatted_amount}"
        };

        return static::log($action, $payment, $description);
    }

    /**
     * Log a refund request activity.
     * 
     * This static method provides a specialized way to log refund request
     * activities with appropriate descriptions.
     * 
     * @param string $action
     * @param RefundRequest $refundRequest
     * @param string|null $customDescription
     * @return static
     */
    public static function logRefundRequest(
        string $action, 
        RefundRequest $refundRequest, 
        ?string $customDescription = null
    ): static {
        $description = $customDescription ?? match($action) {
            'created' => "Refund request of {$refundRequest->formatted_refund_amount} submitted",
            'approved' => "Refund request of {$refundRequest->formatted_refund_amount} approved",
            'rejected' => "Refund request of {$refundRequest->formatted_refund_amount} rejected",
            default => "Refund request {$action}: {$refundRequest->formatted_refund_amount}"
        };

        return static::log($action, $refundRequest, $description);
    }

    /**
     * Scope a query for a specific action.
     * 
     * This scope filters activity logs by the action performed.
     */
    public function scopeForAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /**
     * Scope a query for a specific user.
     * 
     * This scope filters activity logs by the user who performed them.
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope a query for a specific subject type.
     * 
     * This scope filters activity logs by the type of subject acted upon.
     */
    public function scopeForSubjectType($query, string $subjectType)
    {
        return $query->where('subject_type', $subjectType);
    }

    /**
     * Scope a query for a specific subject.
     * 
     * This scope filters activity logs by the specific subject acted upon.
     */
    public function scopeForSubject($query, string $subjectType, int $subjectId)
    {
        return $query->where('subject_type', $subjectType)
                    ->where('subject_id', $subjectId);
    }

    /**
     * Scope a query ordered by creation date.
     * 
     * This scope provides consistent ordering for activity log displays.
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /**
     * Scope a query for recent activities.
     * 
     * This scope filters activity logs to show only recent activities
     * within the specified number of days.
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }
}
