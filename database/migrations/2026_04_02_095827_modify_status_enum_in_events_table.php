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
        // For MySQL/MariaDB, we use a raw statement to modify the ENUM
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'published', 'cancelled', 'completed', 'rescheduled') DEFAULT 'draft'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'published', 'cancelled', 'completed') DEFAULT 'draft'");
    }
};
