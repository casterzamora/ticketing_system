<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| The frontend is a React SPA. Any non-API path should return the same
| root container and let React Router handle client-side routing.
|--------------------------------------------------------------------------
*/

Route::view('/', 'welcome');

Route::get('/tickets/{reference}/pdf', [App\Http\Controllers\Api\BookingController::class, 'downloadTicketPdf'])
    ->name('tickets.pdf');

Route::view('/{any}', 'welcome')->where('any', '^(?!api|sanctum).*$');
