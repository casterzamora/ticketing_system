<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Create activity_logs table
 * 
 * This migration creates the activity_logs table to track all important
 * system actions for audit purposes and user activity monitoring.
 * 
 * Business Rules:
 * - Log all critical actions (bookings, payments, refunds)
 * - Track user who performed the action
 * - Store old and new values for change tracking
 * - Support soft deletes for complete audit trail
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            
            // Action information
            $table->string('action', 100); // created, updated, deleted, etc.
            $table->string('subject_type', 100); // model class name
            $table->unsignedBigInteger('subject_id'); // model ID
            $table->text('description')->nullable();
            
            // User who performed the action
            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->onDelete('set null')
                  ->comment('User who performed this action');
            
            // IP address and user agent for security
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            
            // Change tracking (JSON)
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            
            $table->timestamps();
            
            // Indexes for performance
            $table->index(['subject_type', 'subject_id']);
            $table->index(['user_id', 'created_at']);
            $table->index('action');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
