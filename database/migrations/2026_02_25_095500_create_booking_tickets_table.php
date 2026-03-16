<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create booking_tickets table
 * 
 * This migration creates the booking_tickets pivot table that tracks
 * individual ticket purchases within a booking. Each record represents
 * a specific ticket type purchased in a booking.
 * 
 * Business Rules:
 * - Tracks quantity and price for each ticket type in a booking
 * - Ensures data integrity with foreign key constraints
 * - Prevents duplicate ticket type entries per booking
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('booking_tickets', function (Blueprint $table) {
            $table->id();
            
            // Ticket quantity and pricing at time of booking
            $table->integer('quantity')->unsigned();
            $table->decimal('price_per_ticket', 10, 2)->unsigned();
            $table->decimal('total_price', 10, 2)->unsigned();
            
            // Foreign keys with cascade delete
            $table->foreignId('booking_id')
                  ->constrained('bookings')
                  ->onDelete('cascade')
                  ->comment('Booking this ticket belongs to');
            
            $table->foreignId('ticket_type_id')
                  ->constrained('ticket_types')
                  ->onDelete('cascade')
                  ->comment('Type of ticket purchased');
            
            $table->timestamps();
            
            // Prevent duplicate ticket types in the same booking
            $table->unique(['booking_id', 'ticket_type_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_tickets');
    }
};
