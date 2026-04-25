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
            if (!Schema::hasColumn('bookings', 'expires_at')) {
                $table->timestamp('expires_at')->nullable()->after('status');
            }
        });

        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'proof_id')) {
                // For manual payment verification (screenshots/receipts)
                $table->string('proof_image_path', 500)->nullable()->after('status');
                $table->string('payment_reference', 100)->nullable()->after('proof_image_path');
                $table->text('sender_notes')->nullable()->after('payment_reference');
            }
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('expires_at');
        });
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn(['proof_image_path', 'payment_reference', 'sender_notes']);
        });
    }
};
