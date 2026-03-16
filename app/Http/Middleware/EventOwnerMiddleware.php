<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Event Owner Middleware
 * 
 * This middleware ensures that only the event creator or admins
 * can access and modify specific events.
 * 
 * Business Rules:
 * - Event creators can manage their own events
 * - Admins can manage all events
 * - Prevent unauthorized event access/modification
 */
class EventOwnerMiddleware
{
    /**
     * Handle an incoming request.
     * 
     * This method checks if the authenticated user is the event owner
     * or has admin privileges for the specific event.
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

        // Get the event from the route
        $event = $request->route('event');
        
        if (!$event) {
            return redirect()->back()
                ->with('error', 'Event not found.');
        }

        // Check if user is admin or event owner
        if (!auth()->user()->isAdmin() && auth()->id() !== $event->created_by) {
            // Log unauthorized access attempt
            \App\Services\ActivityLogService::logSecurity(
                'unauthorized_event_access',
                'User attempted to access event without ownership',
                auth()->id(),
                [
                    'event_id' => $event->id,
                    'event_title' => $event->title,
                    'requested_url' => $request->fullUrl(),
                    'ip_address' => $request->ip(),
                ]
            );

            return redirect()->route('dashboard')
                ->with('error', 'You do not have permission to manage this event.');
        }

        return $next($request);
    }
}
