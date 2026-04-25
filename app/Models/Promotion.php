<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

class Promotion extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'code',
        'description',
        'discount_type',
        'discount_value',
        'usage_limit',
        'used_count',
        'starts_at',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'usage_limit' => 'integer',
        'used_count' => 'integer',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Scope to only include active promotions.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('starts_at')
                  ->orWhere('starts_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>=', now());
            });
    }

    /**
     * Check if the promotion is valid for use.
     */
    public function isValid(): bool
    {
        if (!$this->is_active) return false;
        
        if ($this->starts_at && $this->starts_at->isFuture()) return false;
        
        if ($this->expires_at && $this->expires_at->isPast()) return false;
        
        if ($this->usage_limit !== null && $this->used_count >= $this->usage_limit) return false;
        
        return true;
    }

    /**
     * Calculate discount amount.
     */
    public function calculateDiscount($subtotal): float
    {
        if ($this->discount_type === 'percentage') {
            return (float) ($subtotal * ($this->discount_value / 100));
        }
        
        return (float) $this->discount_value;
    }

    /**
     * Increment usage.
     */
    public function incrementUsage()
    {
        $this->increment('used_count');
    }
}
