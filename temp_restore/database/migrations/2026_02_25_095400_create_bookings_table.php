<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create bookings table
 * 
 * This migration creates the bookings table which is the core transaction
 * entity of the system. Bookings represent customer orders for tickets.
 * 
 * Business Rules:
 * - Each booking belongs to a user and event
 * - Booking status follows: pending -> confirmed -> cancelled -> refunded
 * - Prevent double booking through unique constraints
 * - Track total amount and booking reference
 * - Support soft deletes for audit trail
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            
            // Booking reference (unique identifier for customers)
            $table->string('booking_reference', 20)->unique();
            
            // Booking information
            $table->integer('total_tickets')->unsigned();
            $table->decimal('total_amount', 10, 2)->unsigned();
            
            // Booking status lifecycle management
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'refunded'])
                  ->default('pending')
                  ->comment('Booking status: pending -> confirmed -> cancelled -> refunded');
            
            // Customer information (can be different from logged-in user)
            $table->string('customer_name', 255);
            $table->string('customer_email', 255);
            $table->string('customer_phone', 20)->nullable();
            
            // Special requirements or notes
            $table->text('special_requirements')->nullable();
            
            // Foreign keys with proper constraints
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade')
                  ->comment('User who made the booking');
            
            $table->foreignId('event_id')
                  ->constrained('events')
                  ->onDelete('cascade')
                  ->comment('Event being booked');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for performance
            $table->index(['user_id', 'status']);
            $table->index(['event_id', 'status']);
            $table->index('booking_reference');
            $table->index('customer_email');
            
            // Prevent multiple bookings for the same user and event
            $table->unique(['user_id', 'event_id'], 'unique_user_event_booking');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
