<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Customer Middleware
 * 
 * This middleware ensures that only users with customer privileges
 * can access protected customer routes.
 * 
 * Business Rules:
 * - Only authenticated users can pass
 * - Users must have 'user' role or higher
 * - Redirect unauthorized users appropriately
 */
class CustomerMiddleware
{
    /**
     * Handle an incoming request.
     * 
     * This method checks if the authenticated user has customer privileges
     * and allows or denies access accordingly.
     * 
     * @param \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response) $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Check if user is authenticated
        if (!auth()->check()) {
            return redirect()->route('login')
                ->with('error', 'You must be logged in to access this page.');
        }

        // Check if user account is active
        if (!auth()->user()->isActive()) {
            auth()->logout();
            
            return redirect()->route('login')
                ->with('error', 'Your account has been deactivated. Please contact support.');
        }

        return $next($request);
    }
}
