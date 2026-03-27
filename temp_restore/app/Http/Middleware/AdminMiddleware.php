<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin Middleware
 * 
 * This middleware ensures that only users with admin privileges
 * can access protected admin routes.
 * 
 * Business Rules:
 * - Only users with 'admin' role can pass
 * - Redirect unauthorized users with appropriate message
 * - Log unauthorized access attempts
 */
class AdminMiddleware
{
    /**
     * Handle an incoming request.
     * 
     * This method checks if the authenticated user has admin privileges
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

        // Check if user has admin role
        if (!auth()->user()->isAdmin()) {
            // Log unauthorized access attempt
            \App\Services\ActivityLogService::logSecurity(
                'unauthorized_admin_access',
                'User attempted to access admin area without privileges',
                auth()->id(),
                [
                    'requested_url' => $request->fullUrl(),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]
            );

            return redirect()->route('user.dashboard')
                ->with('error', 'You do not have permission to access the admin area.');
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
