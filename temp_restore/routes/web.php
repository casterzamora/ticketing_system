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
Route::view('/{any}', 'welcome')->where('any', '^(?!api|sanctum).*$');
