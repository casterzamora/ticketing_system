<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\BookingService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('bookings:cleanup-expired', function () {
    $count = BookingService::cleanupExpiredBookings();
    $this->info("Expired bookings cleaned: {$count}");
})->purpose('Cancel expired pending bookings and release inventory');

Schedule::command('bookings:cleanup-expired')->everyFiveMinutes();
