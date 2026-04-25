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
        Schema::table('events', function (Blueprint $table) {
            $table->string('image_url', 255)->nullable()->change();
            $table->string('video_url', 255)->nullable()->change();
            $table->string('timezone', 50)->default('Asia/Manila')->change();
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('image_url', 255)->nullable(false)->change();
            $table->string('video_url', 255)->nullable(false)->change();
            $table->string('timezone', 50)->nullable(false)->change();
        });
    }
};
