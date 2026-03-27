<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create refund_requests table
 * 
 * This migration creates the refund_requests table to manage customer
 * refund requests with an approval workflow.
 * 
 * Business Rules:
 * - Refund allowed only 48+ hours before event
 * - Only one refund request per booking
 * - Refund status: pending -> approved -> rejected
 * - Must track reason and approval details
 * - Support soft deletes for audit trail
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('refund_requests', function (Blueprint $table) {
            $table->id();
            
            // Refund amount and reason
            $table->decimal('refund_amount', 10, 2)->unsigned();
            $table->text('reason');
            $table->text('admin_notes')->nullable();
            
            // Refund status workflow
            $table->enum('status', ['pending', 'approved', 'rejected'])
                  ->default('pending')
                  ->comment('Refund status: pending -> approved/rejected');
            
            // Approval workflow tracking
            $table->foreignId('approved_by')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null')
                  ->comment('Admin who approved/rejected this refund');
            
            $table->dateTime('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            
            // Processing information
            $table->dateTime('processed_at')->nullable();
            $table->string('refund_method', 50)->nullable();
            $table->string('refund_reference', 255)->nullable();
            
            // Foreign key to booking
            $table->foreignId('booking_id')
                  ->constrained('bookings')
                  ->onDelete('cascade')
                  ->comment('Booking this refund request belongs to');
            
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes for performance
            $table->index(['booking_id', 'status']);
            $table->index(['status', 'created_at']);
            $table->index('approved_by');
            
            // Ensure only one refund request per booking
            $table->unique('booking_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('refund_requests');
    }
};
