<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create ticket_types table
 * 
 * This migration creates the ticket types table that defines different
 * ticket categories for events (e.g., VIP, General Admission, Student).
 * Each event can have multiple ticket types with different pricing.
 * 
 * Business Rules:
 * - Ticket types must belong to an event
 * - Each ticket type has its own price and capacity
 * - Prevent overselling with quantity_sold tracking
 * - Support soft deletes for audit trail
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('ticket_types', function (Blueprint $table) {
            $table->id();
            
            // Ticket type information
            $table->string('name', 100);
            $table->text('description')->nullable();
            
            // Pricing and capacity
            $table->decimal('price', 10, 2)->unsigned();
            $table->integer('quantity_available')->unsigned();
            $table->integer('quantity_sold')->unsigned()->default(0);
            
            // Ticket type status
            $table->boolean('is_active')->default(true);
            
            // Foreign key to event with cascade delete
            $table->foreignId('event_id')
                  ->constrained('events')
                  ->onDelete('cascade')
                  ->comment('Event this ticket type belongs to');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for performance
            $table->index(['event_id', 'is_active']);
            $table->index('price');
            
            // Prevent duplicate ticket type names for the same event
            $table->unique(['event_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ticket_types');
    }
};
