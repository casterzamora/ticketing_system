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
        if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'published', 'cancelled', 'completed', 'rescheduled') DEFAULT 'draft'");
        } else {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check");
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'published', 'cancelled', 'completed', 'rescheduled'))");
        }
    }

    public function down(): void
    {
        if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE events MODIFY COLUMN status ENUM('draft', 'published', 'cancelled', 'completed') DEFAULT 'draft'");
        } else {
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check");
            \Illuminate\Support\Facades\DB::statement("ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN ('draft', 'published', 'cancelled', 'completed'))");
        }
    }
};
