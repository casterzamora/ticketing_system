<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            // Check for names to avoid any interference
            if (!Schema::hasColumn('bookings', 'paid_at')) {
                $table->timestamp('paid_at')->nullable()->after('expires_at');
            }
            if (!Schema::hasColumn('bookings', 'session_id')) {
                // Tracking external checkout session IDs (Stripe/PayPal/Xendit)
                $table->string('external_session_id')->nullable()->after('paid_at');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'webhook_event_id')) {
                $table->string('webhook_event_id')->nullable()->after('transaction_id');
            }
            if (!Schema::hasColumn('payments', 'meta_data')) {
                // To store raw JSON safely
                $table->json('meta_data')->nullable()->after('webhook_event_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn(['paid_at', 'external_session_id']);
        });
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['webhook_event_id', 'meta_data']);
        });
    }
};
