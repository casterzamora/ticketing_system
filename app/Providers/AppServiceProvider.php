<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\URL;

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
        if (filter_var(env('APP_FORCE_HTTPS', false), FILTER_VALIDATE_BOOL)) {
            URL::forceScheme('https');
        }

        if ($rootUrl = env('APP_FORCE_ROOT_URL')) {
            URL::forceRootUrl($rootUrl);
        }

        // Automatically update last login timestamp when any user logs in
        Event::listen(Login::class, function ($event) {
            if (method_exists($event->user, 'updateLastLogin')) {
                $event->user->updateLastLogin();
            }
        });
    }
}
