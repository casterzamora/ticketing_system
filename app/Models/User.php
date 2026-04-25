<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * User Model
 * 
 * This model represents users in the ticketing system with role-based
 * access control. Users can be either admins (event managers) or
 * customers (ticket buyers).
 * 
 * Relationships:
 * - hasMany: Event (as creator), Booking
 * - hasMany: ActivityLog (as performer)
 * - hasMany: RefundRequest (as approver)
 * 
 * Business Logic:
 * - Role-based access control using Spatie Permission
 * - Track user activity and login times
 * - Support profile information and status management
 */
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'username',
        'first_name',
        'last_name',
        'email',
        'phone',
        'password',
        'is_active',
        'last_login_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the events created by this user.
     * 
     * This relationship tracks events created by admin users
     * for accountability and management purposes.
     */
    public function events()
    {
        return $this->hasMany(Event::class, 'created_by');
    }

    /**
     * Get the bookings made by this user.
     * 
     * This relationship tracks all bookings made by customers
     * for order history and management.
     */
    public function bookings()
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Get the activity logs for this user.
     * 
     * This relationship tracks all actions performed by this user
     * for audit and accountability purposes.
     */
    public function activityLogs()
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function notificationLogs()
    {
        return $this->hasMany(NotificationLog::class);
    }

    /**
     * Get the refund requests approved by this user.
     * 
     * This relationship tracks refund requests that this admin user
     * has approved or rejected.
     */
    public function approvedRefundRequests()
    {
        return $this->hasMany(RefundRequest::class, 'approved_by');
    }

    /**
     * Check if the user is an admin.
     * 
     * This method determines if the user has admin privileges
     * using the role system.
     * 
     * @return bool
     */
    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    /**
     * Check if the user is a customer.
     * 
     * This method determines if the user has customer privileges
     * using the role system.
     * 
     * @return bool
     */
    public function isCustomer(): bool
    {
        return $this->hasRole('user');
    }

    /**
     * Check if the user is active.
     * 
     * This method determines if the user account is active
     * and can access the system.
     * 
     * @return bool
     */
    public function isActive(): bool
    {
        return $this->is_active;
    }

    /**
     * Get the user's full name.
     * 
     * This accessor combines first and last name for display purposes.
     * Falls back to the name field if first/last names are not set.
     * 
     * @return string
     */
    public function getFullNameAttribute(): string
    {
        if ($this->first_name && $this->last_name) {
            return "{$this->first_name} {$this->last_name}";
        }

        return $this->name;
    }

    /**
     * Get the user's display name.
     * 
     * This accessor provides a consistent display name format
     * throughout the application.
     * 
     * @return string
     */
    public function getDisplayNameAttribute(): string
    {
        return $this->full_name ?: $this->email;
    }

    /**
     * Update the last login timestamp.
     * 
     * This method updates the user's last login time for tracking
     * and analytics purposes.
     * 
     * @return bool
     */
    public function updateLastLogin(): bool
    {
        $this->last_login_at = now();
        return $this->save();
    }

    /**
     * Scope a query to only include active users.
     * 
     * This scope filters users to show only those with active accounts.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include admin users.
     * 
     * This scope filters users to show only those with admin roles.
     */
    public function scopeAdmins($query)
    {
        return $query->role('admin');
    }

    /**
     * Scope a query to only include customer users.
     * 
     * This scope filters users to show only those with customer roles.
     */
    public function scopeCustomers($query)
    {
        return $query->role('user');
    }

    /**
     * Scope a query ordered by name.
     * 
     * This scope provides consistent ordering for user displays.
     */
    public function scopeOrderByName($query)
    {
        return $query->orderBy('last_name')->orderBy('first_name')->orderBy('name');
    }

    /**
     * Scope a query for recent users.
     * 
     * This scope filters users to show only those created recently
     * within the specified number of days.
     */
    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }
}
