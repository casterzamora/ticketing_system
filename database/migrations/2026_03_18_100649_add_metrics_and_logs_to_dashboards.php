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
        // Activity logs already exists from previous steps,
        // we use this migration to ensure the schema for revenue tracking
        // (total_amount in bookings) and stock (quantity in ticket_types) is validated.
        
        if (!Schema::hasColumn('bookings', 'total_amount')) {
            Schema::table('bookings', function (Blueprint $table) {
                $table->decimal('total_amount', 12, 2)->after('total_tickets');
            });
        }

        if (!Schema::hasColumn('ticket_types', 'quantity_sold')) {
            Schema::table('ticket_types', function (Blueprint $table) {
                $table->integer('quantity_sold')->default(0)->after('quantity_available');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_logs', function (Blueprint $table) {
            //
        });
    }
};
