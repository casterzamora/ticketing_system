<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * EventCategory Model
 * 
 * This model represents event categories for organizing events into
 * different types like concerts, sports, theater, etc.
 * 
 * Relationships:
 * - belongsTo: EventCategory (parent)
 * - hasMany: EventCategory (children)
 * - belongsToMany: Event
 * 
 * Business Logic:
 * - Support hierarchical categories
 * - Track active status for filtering
 * - Provide slug for URL-friendly category names
 */
class EventCategory extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     * 
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'color',
        'parent_id',
        'is_active',
        'sort_order',
    ];

    /**
     * The attributes that should be cast.
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Get the parent category.
     * 
     * This relationship allows for hierarchical category structure
     * where categories can have parent-child relationships.
     */
    public function parent()
    {
        return $this->belongsTo(EventCategory::class, 'parent_id');
    }

    /**
     * Get the child categories.
     * 
     * This relationship allows categories to have sub-categories
     * for more granular organization.
     */
    public function children()
    {
        return $this->hasMany(EventCategory::class, 'parent_id');
    }

    /**
     * Get the events in this category.
     * 
     * This many-to-many relationship connects categories to events,
     * allowing events to belong to multiple categories.
     */
    public function events()
    {
        return $this->belongsToMany(Event::class, 'event_category_event');
    }

    /**
     * Get active events in this category.
     * 
     * This relationship filters to only show active, published events
     * that are available for booking.
     */
    public function activeEvents()
    {
        return $this->events()
            ->where('is_active', true)
            ->where('status', 'published')
            ->upcoming();
    }

    /**
     * Check if this is a root category (has no parent).
     * 
     * @return bool
     */
    public function isRoot(): bool
    {
        return is_null($this->parent_id);
    }

    /**
     * Check if this category has children.
     * 
     * @return bool
     */
    public function hasChildren(): bool
    {
        return $this->children()->count() > 0;
    }

    /**
     * Get the full category path including parent categories.
     * 
     * This method builds a breadcrumb trail for nested categories.
     * 
     * @return string
     */
    public function getFullPathAttribute(): string
    {
        if ($this->isRoot()) {
            return $this->name;
        }

        return $this->parent->full_path . ' > ' . $this->name;
    }

    /**
     * Get the count of active events in this category.
     * 
     * @return int
     */
    public function getActiveEventCountAttribute(): int
    {
        return $this->activeEvents()->count();
    }

    /**
     * Scope a query to only include active categories.
     * 
     * This scope filters categories to show only those that are active
     * for customer-facing displays.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope a query to only include root categories.
     * 
     * This scope filters categories to show only top-level categories
     * for navigation menus.
     */
    public function scopeRoot($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope a query ordered by sort order and name.
     * 
     * This scope provides consistent ordering for category displays.
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Scope a query to include event counts.
     * 
     * This scope adds event count statistics for efficient queries.
     */
    public function scopeWithEventCounts($query)
    {
        return $query->withCount(['events as total_events', 'activeEvents as active_events']);
    }
}
