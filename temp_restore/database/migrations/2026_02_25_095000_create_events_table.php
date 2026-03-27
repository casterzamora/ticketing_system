<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create events table
 * 
 * This migration creates the main events table that will store all event information.
 * Events are the core entity of the ticketing system and have relationships with
 * tickets, bookings, and categories.
 * 
 * Business Rules:
 * - Events must have a title, description, start_time, and end_time
 * - Events can be active or inactive (status)
 * - Events have capacity limits to prevent overselling
 * - Events support soft deletes for data retention
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            
            // Basic event information
            $table->string('title', 255);
            $table->text('description');
            $table->string('venue', 255);
            $table->string('address', 500);
            
            // Event timing with timezone support
            $table->dateTime('start_time');
            $table->dateTime('end_time');
            $table->string('timezone', 50)->default('UTC');
            
            // Event capacity and pricing
            $table->integer('max_capacity')->unsigned();
            $table->decimal('base_price', 10, 2)->unsigned();
            
            // Event status management
            $table->enum('status', ['draft', 'published', 'cancelled', 'completed'])
                  ->default('draft');
            
            // Event visibility and featured status
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);
            
            // Event image handling
            $table->string('image_url', 500)->nullable();
            
            // Foreign key to event creator (admin user)
            $table->foreignId('created_by')
                  ->constrained('users')
                  ->onDelete('cascade')
                  ->comment('User who created this event');
            
            // Timestamps with soft deletes
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for performance
            $table->index(['status', 'is_active']);
            $table->index('start_time');
            $table->index('created_by');
            
            // Prevent duplicate event titles for the same date
            $table->unique(['title', 'start_time']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
