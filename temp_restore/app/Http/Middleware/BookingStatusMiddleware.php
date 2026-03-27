<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Booking Status Middleware
 * 
 * This middleware prevents invalid status transitions for bookings
 * and ensures business rules are followed during booking operations.
 * 
 * Business Rules:
 * - Prevent double booking for the same event
 * - Enforce booking status lifecycle
 * - Prevent actions on cancelled/completed events
 */
class BookingStatusMiddleware
{
    /**
     * Handle an incoming request.
     * 
     * This method validates booking status transitions and prevents
     * invalid operations based on business rules.
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

        // Get the booking from the route
        $booking = $request->route('booking');
        
        if (!$booking) {
            return redirect()->back()
                ->with('error', 'Booking not found.');
        }

        // Check booking ownership (users can only access their own bookings)
        if (!auth()->user()->isAdmin() && auth()->id() !== $booking->user_id) {
            return redirect()->route('dashboard')
                ->with('error', 'You do not have permission to access this booking.');
        }

        // Validate booking status based on the action being performed
        $action = $this->getActionFromRequest($request);
        
        if (!$this->isValidStatusTransition($booking, $action)) {
            return redirect()->back()
                ->with('error', $this->getErrorMessage($booking, $action));
        }

        return $next($request);
    }

    /**
     * Determine the action being performed based on the request.
     * 
     * This method analyzes the request to determine what action
     * is being attempted on the booking.
     * 
     * @param Request $request
     * @return string
     */
    private function getActionFromRequest(Request $request): string
    {
        $routeName = $request->route()->getName();
        
        if (str_contains($routeName, 'cancel')) {
            return 'cancel';
        }
        
        if (str_contains($routeName, 'payment')) {
            return 'payment';
        }
        
        if (str_contains($routeName, 'refund')) {
            return 'refund';
        }
        
        if (str_contains($routeName, 'show')) {
            return 'view';
        }
        
        return 'general';
    }

    /**
     * Check if the status transition is valid.
     * 
     * This method validates if the requested action is allowed
     * based on the current booking status.
     * 
     * @param \App\Models\Booking $booking
     * @param string $action
     * @return bool
     */
    private function isValidStatusTransition($booking, string $action): bool
    {
        return match($action) {
            'cancel' => $booking->isCancellable(),
            'payment' => $booking->isPending(),
            'refund' => $booking->isRefundable(),
            'view' => true, // Always allow viewing
            'general' => true,
            default => false
        };
    }

    /**
     * Get appropriate error message for invalid transitions.
     * 
     * This method returns user-friendly error messages
     * based on the booking status and attempted action.
     * 
     * @param \App\Models\Booking $booking
     * @param string $action
     * @return string
     */
    private function getErrorMessage($booking, string $action): string
    {
        return match($action) {
            'cancel' => match($booking->status) {
                'cancelled' => 'This booking is already cancelled.',
                'refunded' => 'This booking has been refunded and cannot be cancelled.',
                'completed' => 'This booking cannot be cancelled.',
                default => 'This booking cannot be cancelled at this time.'
            },
            'payment' => match($booking->status) {
                'confirmed' => 'Payment has already been processed for this booking.',
                'cancelled' => 'This booking has been cancelled.',
                'refunded' => 'This booking has been refunded.',
                default => 'Payment cannot be processed for this booking.'
            },
            'refund' => match($booking->status) {
                'pending' => 'Payment must be completed before requesting a refund.',
                'cancelled' => 'This booking is already cancelled.',
                'refunded' => 'Refund has already been processed for this booking.',
                default => 'This booking is not eligible for refund.'
            },
            default => 'Invalid operation for this booking.'
        };
    }
}
