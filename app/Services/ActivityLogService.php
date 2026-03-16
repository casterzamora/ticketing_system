<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\RefundRequest;

/**
 * Activity Log Service
 * 
 * This service provides a centralized way to log activities
 * throughout the application with consistent formatting
 * and business context.
 * 
 * Features:
 * - Automatic user detection
 * - IP address and user agent tracking
 * - Specialized logging methods for different entity types
 * - Change tracking with old and new values
 * - Performance optimized logging
 */
class ActivityLogService
{
    /**
     * Log a general activity.
     * 
     * This method provides a convenient way to log activities
     * with automatic context detection.
     * 
     * @param string $action
     * @param mixed $subject
     * @param string|null $description
     * @param array|null $oldValues
     * @param array|null $newValues
     * @return ActivityLog
     */
    public static function log(
        string $action, 
        $subject, 
        ?string $description = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): ActivityLog {
        return ActivityLog::log($action, $subject, $description, $oldValues, $newValues);
    }

    /**
     * Log a booking-related activity.
     * 
     * This method provides specialized logging for booking activities
     * with appropriate descriptions and context.
     * 
     * @param string $action
     * @param Booking $booking
     * @param string|null $customDescription
     * @return ActivityLog
     */
    public static function logBooking(
        string $action, 
        Booking $booking, 
        ?string $customDescription = null
    ): ActivityLog {
        return ActivityLog::logBooking($action, $booking, $customDescription);
    }

    /**
     * Log a payment-related activity.
     * 
     * This method provides specialized logging for payment activities
     * with appropriate descriptions and context.
     * 
     * @param string $action
     * @param Payment $payment
     * @param string|null $customDescription
     * @return ActivityLog
     */
    public static function logPayment(
        string $action, 
        Payment $payment, 
        ?string $customDescription = null
    ): ActivityLog {
        return ActivityLog::logPayment($action, $payment, $customDescription);
    }

    /**
     * Log a refund request activity.
     * 
     * This method provides specialized logging for refund request
     * activities with appropriate descriptions and context.
     * 
     * @param string $action
     * @param RefundRequest $refundRequest
     * @param string|null $customDescription
     * @return ActivityLog
     */
    public static function logRefundRequest(
        string $action, 
        RefundRequest $refundRequest, 
        ?string $customDescription = null
    ): ActivityLog {
        return ActivityLog::logRefundRequest($action, $refundRequest, $customDescription);
    }

    /**
     * Log user authentication activity.
     * 
     * This method logs user login, logout, and authentication
     * related activities for security monitoring.
     * 
     * @param string $action
     * @param int $userId
     * @param string|null $description
     * @return ActivityLog
     */
    public static function logAuth(
        string $action, 
        int $userId, 
        ?string $description = null
    ): ActivityLog {
        $description = $description ?? match($action) {
            'login' => 'User logged in',
            'logout' => 'User logged out',
            'failed_login' => 'Failed login attempt',
            'password_change' => 'Password changed',
            'account_created' => 'Account created',
            default => "Authentication action: {$action}"
        };

        return ActivityLog::create([
            'action' => $action,
            'subject_type' => 'App\Models\User',
            'subject_id' => $userId,
            'description' => $description,
            'user_id' => $userId,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log admin activity.
     * 
     * This method logs administrative actions for audit purposes
     * with enhanced context and security tracking.
     * 
     * @param string $action
     * @param mixed $subject
     * @param string|null $description
     * @param array|null $oldValues
     * @param array|null $newValues
     * @return ActivityLog
     */
    public static function logAdmin(
        string $action, 
        $subject, 
        ?string $description = null,
        ?array $oldValues = null,
        ?array $newValues = null
    ): ActivityLog {
        $adminDescription = "[ADMIN] " . ($description ?? "Admin {$action} performed");
        
        return self::log($action, $subject, $adminDescription, $oldValues, $newValues);
    }

    /**
     * Log system activity.
     * 
     * This method logs system-level activities that don't
     * have a specific user context.
     * 
     * @param string $action
     * @param string $description
     * @param array|null $metadata
     * @return ActivityLog
     */
    public static function logSystem(
        string $action, 
        string $description,
        ?array $metadata = null
    ): ActivityLog {
        return ActivityLog::create([
            'action' => $action,
            'subject_type' => 'System',
            'subject_id' => 0,
            'description' => "[SYSTEM] {$description}",
            'user_id' => null,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'old_values' => $metadata,
        ]);
    }

    /**
     * Log bulk operations.
     * 
     * This method logs bulk operations like mass approvals,
     * cancellations, or updates with summary information.
     * 
     * @param string $action
     * @param string $entityType
     * @param int $count
     * @param array|null $details
     * @return ActivityLog
     */
    public static function logBulk(
        string $action, 
        string $entityType, 
        int $count,
        ?array $details = null
    ): ActivityLog {
        $description = "Bulk {$action}: {$count} {$entityType} records";
        
        if ($details) {
            $description .= " - " . json_encode($details);
        }

        return ActivityLog::create([
            'action' => "bulk_{$action}",
            'subject_type' => $entityType,
            'subject_id' => 0,
            'description' => $description,
            'user_id' => auth()->id(),
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'new_values' => $details,
        ]);
    }

    /**
     * Log security-related activity.
     * 
     * This method logs security events like failed access attempts,
     * suspicious activities, or policy violations.
     * 
     * @param string $event
     * @param string $description
     * @param int|null $userId
     * @param array|null $details
     * @return ActivityLog
     */
    public static function logSecurity(
        string $event, 
        string $description,
        ?int $userId = null,
        ?array $details = null
    ): ActivityLog {
        return ActivityLog::create([
            'action' => "security_{$event}",
            'subject_type' => 'Security',
            'subject_id' => 0,
            'description' => "[SECURITY] {$description}",
            'user_id' => $userId,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
            'new_values' => $details,
        ]);
    }

    /**
     * Get activity statistics.
     * 
     * This method returns activity statistics for reporting
     * and analytics purposes.
     * 
     * @param int $days
     * @return array
     */
    public static function getStats(int $days = 30): array
    {
        $query = ActivityLog::where('created_at', '>=', now()->subDays($days));

        return [
            'total_activities' => $query->count(),
            'activities_by_action' => $query->selectRaw('action, count(*) as count')
                ->groupBy('action')
                ->orderBy('count', 'desc')
                ->get()
                ->pluck('count', 'action')
                ->toArray(),
            'activities_by_user' => $query->whereNotNull('user_id')
                ->selectRaw('user_id, count(*) as count')
                ->groupBy('user_id')
                ->orderBy('count', 'desc')
                ->limit(10)
                ->get()
                ->toArray(),
            'recent_activities' => $query->with('user')
                ->latest()
                ->limit(50)
                ->get(),
            'security_events' => $query->where('action', 'like', 'security_%')
                ->count(),
        ];
    }

    /**
     * Clean up old activity logs.
     * 
     * This method removes old activity logs to maintain
     * database performance while retaining important records.
     * 
     * @param int $daysToKeep
     * @return int
     */
    public static function cleanup(int $daysToKeep = 90): int
    {
        $cutoffDate = now()->subDays($daysToKeep);
        
        // Keep security events and admin activities longer
        return ActivityLog::where('created_at', '<', $cutoffDate)
            ->where(function ($query) {
                $query->where('action', 'not like', 'security_%')
                      ->where('action', 'not like', 'bulk_%');
            })
            ->delete();
    }

    /**
     * Export activity logs.
     * 
     * This method exports activity logs for compliance
     * and audit purposes.
     * 
     * @param array $filters
     * @return \Illuminate\Support\Collection
     */
    public static function export(array $filters = []): \Illuminate\Support\Collection
    {
        $query = ActivityLog::with(['user:id,name,email']);

        // Apply filters
        if (!empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (!empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }

        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        if (!empty($filters['subject_type'])) {
            $query->where('subject_type', $filters['subject_type']);
        }

        return $query->orderBy('created_at', 'desc')->get();
    }
}
