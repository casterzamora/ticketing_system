<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use Illuminate\Auth\Events\Login;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Automatically update last login timestamp when any user logs in
        Event::listen(Login::class, function ($event) {
            if (method_exists($event->user, 'updateLastLogin')) {
                $event->user->updateLastLogin();
            }
        });
    }
}
