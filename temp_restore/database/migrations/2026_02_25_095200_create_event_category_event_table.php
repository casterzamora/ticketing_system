<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create event_category_event pivot table
 * 
 * This migration creates the many-to-many relationship table between
 * events and categories. An event can belong to multiple categories.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('event_category_event', function (Blueprint $table) {
            $table->id();
            
            // Foreign keys with cascade delete
            $table->foreignId('event_id')
                  ->constrained('events')
                  ->onDelete('cascade');
            
            $table->foreignId('event_category_id')
                  ->constrained('event_categories')
                  ->onDelete('cascade');
            
            // Prevent duplicate assignments
            $table->unique(['event_id', 'event_category_id']);
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_category_event');
    }
};
