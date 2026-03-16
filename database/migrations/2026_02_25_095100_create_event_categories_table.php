<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create event_categories table
 * 
 * This migration creates the event categories table for organizing events
 * into different categories like concerts, sports, theater, etc.
 * Categories help users find relevant events and enable filtering.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('event_categories', function (Blueprint $table) {
            $table->id();
            
            // Category information
            $table->string('name', 100)->unique();
            $table->string('slug', 100)->unique();
            $table->text('description')->nullable();
            $table->string('color', 7)->default('#6B7280'); // Hex color code
            
            // Category hierarchy support
            $table->foreignId('parent_id')
                  ->nullable()
                  ->constrained('event_categories')
                  ->onDelete('cascade');
            
            // Category status
            $table->boolean('is_active')->default(true);
            
            // Sorting order
            $table->integer('sort_order')->default(0);
            
            $table->timestamps();
            
            // Indexes
            $table->index(['is_active', 'sort_order']);
            $table->index('slug');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_categories');
    }
};
