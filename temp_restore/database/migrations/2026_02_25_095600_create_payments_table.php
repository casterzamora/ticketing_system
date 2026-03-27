<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create payments table
 * 
 * This migration creates the payments table to track all payment transactions
 * associated with bookings. This supports multiple payment methods and
 * provides a complete audit trail.
 * 
 * Business Rules:
 * - Payment status: pending -> successful -> failed
 * - Each booking can have multiple payment attempts
 * - Track payment method and transaction details
 * - Support refunds with reference to original payment
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            
            // Payment amount and currency
            $table->decimal('amount', 10, 2)->unsigned();
            $table->string('currency', 3)->default('USD');
            
            // Payment status lifecycle
            $table->enum('status', ['pending', 'successful', 'failed', 'refunded'])
                  ->default('pending')
                  ->comment('Payment status: pending -> successful -> failed');
            
            // Payment method and gateway information
            $table->string('payment_method', 50); // credit_card, paypal, stripe, etc.
            $table->string('gateway', 50)->nullable(); // payment gateway used
            $table->string('transaction_id', 255)->nullable(); // gateway transaction ID
            
            // Payment processing details
            $table->text('gateway_response')->nullable(); // raw response from gateway
            $table->dateTime('processed_at')->nullable(); // when payment was processed
            
            // Refund information
            $table->foreignId('original_payment_id')
                  ->nullable()
                  ->constrained('payments')
                  ->onDelete('cascade')
                  ->comment('Original payment for refunds');
            
            // Foreign key to booking
            $table->foreignId('booking_id')
                  ->constrained('bookings')
                  ->onDelete('cascade')
                  ->comment('Booking this payment belongs to');
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['booking_id', 'status']);
            $table->index('transaction_id');
            $table->index('payment_method');
            $table->index('processed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
