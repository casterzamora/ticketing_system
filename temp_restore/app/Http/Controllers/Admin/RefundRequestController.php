<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ApproveRefundRequest;
use App\Http\Requests\Admin\RejectRefundRequest;
use App\Models\Booking;
use App\Models\RefundRequest;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Http\RedirectResponse;

/**
 * Admin RefundRequest Controller
 * 
 * This controller handles refund request management for administrators.
 * It includes the approval workflow and refund processing.
 * 
 * Business Logic:
 * - Admin-only access control
 * - Refund request approval/rejection workflow
 * - Business rule enforcement (48-hour policy)
 * - Automatic booking status updates
 * - Activity logging for audit trail
 * - Payment processing integration
 */
class RefundRequestController extends Controller
{
    /**
     * Display a listing of refund requests.
     * 
     * This method shows all refund requests with filtering capabilities
     * for different statuses and time periods.
     * 
     * @param Request $request
     * @return View
     */
    public function index(Request $request): View
    {
        $query = RefundRequest::with([
            'booking' => function ($query) {
                $query->with('user', 'event');
            },
            'approvedBy'
        ]);

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('booking', function ($bookingQuery) use ($search) {
                $bookingQuery->where('booking_reference', 'like', "%{$search}%")
                            ->orWhereHas('user', function ($userQuery) use ($search) {
                                $userQuery->where('email', 'like', "%{$search}%")
                                         ->orWhere('name', 'like', "%{$search}%");
                            });
            });
        }

        $refundRequests = $query->latest()->paginate(15);

        // Get statistics
        $stats = [
            'pending_count' => RefundRequest::pending()->count(),
            'approved_count' => RefundRequest::approved()->count(),
            'rejected_count' => RefundRequest::rejected()->count(),
            'total_amount_pending' => RefundRequest::pending()->sum('refund_amount'),
            'total_amount_approved' => RefundRequest::approved()->sum('refund_amount'),
        ];

        return view('admin.refund-requests.index', compact('refundRequests', 'stats'));
    }

    /**
     * Display the specified refund request.
     * 
     * This method shows detailed refund request information including
     * booking details, payment history, and approval workflow.
     * 
     * @param RefundRequest $refundRequest
     * @return View
     */
    public function show(RefundRequest $refundRequest): View
    {
        $refundRequest->load([
            'booking' => function ($query) {
                $query->with('user', 'event', 'bookingTickets.ticketType');
            },
            'approvedBy',
            'booking.payments' => function ($query) {
                $query->latest();
            }
        ]);

        // Check refund eligibility
        $eligibility = [
            'is_eligible' => $refundRequest->canBeApproved(),
            'reasons' => $this->getRefundIneligibilityReasons($refundRequest),
        ];

        return view('admin.refund-requests.show', compact('refundRequest', 'eligibility'));
    }

    /**
     * Approve the specified refund request.
     * 
     * This method processes refund approval including booking status
     * updates, ticket quantity adjustments, and payment processing.
     * 
     * @param ApproveRefundRequest $request
     * @param RefundRequest $refundRequest
     * @return RedirectResponse
     */
    public function approve(ApproveRefundRequest $request, RefundRequest $refundRequest): RedirectResponse
    {
        try {
            // Check if refund can be approved
            if (!$refundRequest->canBeApproved()) {
                return redirect()
                    ->back()
                    ->with('error', 'This refund request cannot be approved based on current business rules.');
            }

            // Process approval
            $success = $refundRequest->approve(
                auth()->id(),
                $request->refund_method
            );

            if (!$success) {
                return redirect()
                    ->back()
                    ->with('error', 'Error processing refund approval.');
            }

            // Log activity
            ActivityLogService::logRefundRequest('approved', $refundRequest);

            return redirect()
                ->route('admin.refund-requests.show', $refundRequest)
                ->with('success', 'Refund request approved and processed successfully!');

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Error approving refund request: ' . $e->getMessage());
        }
    }

    /**
     * Reject the specified refund request.
     * 
     * This method rejects a refund request with a reason and
     * logs the decision for audit purposes.
     * 
     * @param RejectRefundRequest $request
     * @param RefundRequest $refundRequest
     * @return RedirectResponse
     */
    public function reject(RejectRefundRequest $request, RefundRequest $refundRequest): RedirectResponse
    {
        try {
            // Check if refund can be rejected
            if (!$refundRequest->isPending()) {
                return redirect()
                    ->back()
                    ->with('error', 'Only pending refund requests can be rejected.');
            }

            // Process rejection
            $success = $refundRequest->reject(
                auth()->id(),
                $request->rejection_reason
            );

            if (!$success) {
                return redirect()
                    ->back()
                    ->with('error', 'Error processing refund rejection.');
            }

            // Log activity
            ActivityLogService::logRefundRequest('rejected', $refundRequest);

            return redirect()
                ->route('admin.refund-requests.show', $refundRequest)
                ->with('success', 'Refund request rejected successfully!');

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Error rejecting refund request: ' . $e->getMessage());
        }
    }

    /**
     * Display pending refund requests for quick approval.
     * 
     * This method shows a streamlined view of pending refund requests
     * for efficient processing by administrators.
     * 
     * @return View
     */
    public function pending(): View
    {
        $refundRequests = RefundRequest::pending()
            ->with([
                'booking' => function ($query) {
                    $query->with('user', 'event');
                }
            ])
            ->latest()
            ->paginate(20);

        return view('admin.refund-requests.pending', compact('refundRequests'));
    }

    /**
     * Bulk approve multiple refund requests.
     * 
     * This method allows administrators to approve multiple refund
     * requests at once for efficient processing.
     * 
     * @param Request $request
     * @return RedirectResponse
     */
    public function bulkApprove(Request $request): RedirectResponse
    {
        try {
            $request->validate([
                'refund_requests' => 'required|array',
                'refund_requests.*' => 'integer|exists:refund_requests,id',
                'refund_method' => 'required|string|in:original,credit,bank_transfer',
            ]);

            $refundRequestIds = $request->refund_requests;
            $refundMethod = $request->refund_method;
            $approvedCount = 0;
            $failedCount = 0;

            foreach ($refundRequestIds as $refundRequestId) {
                $refundRequest = RefundRequest::find($refundRequestId);
                
                if ($refundRequest && $refundRequest->canBeApproved()) {
                    if ($refundRequest->approve(auth()->id(), $refundMethod)) {
                        $approvedCount++;
                        
                        // Log activity
                        ActivityLogService::logRefundRequest('approved', $refundRequest);
                    } else {
                        $failedCount++;
                    }
                } else {
                    $failedCount++;
                }
            }

            $message = "Bulk approval completed: {$approvedCount} approved, {$failedCount} failed.";
            
            return redirect()
                ->route('admin.refund-requests.pending')
                ->with('success', $message);

        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->with('error', 'Error processing bulk approval: ' . $e->getMessage());
        }
    }

    /**
     * Export refund requests to CSV.
     * 
     * This method generates a CSV export of refund requests
     * for reporting and analysis purposes.
     * 
     * @param Request $request
     * @return \Symfony\Component\HttpFoundation\StreamedResponse
     */
    public function export(Request $request)
    {
        $query = RefundRequest::with([
            'booking' => function ($query) {
                $query->with('user', 'event');
            },
            'approvedBy'
        ]);

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $refundRequests = $query->latest()->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="refund_requests_' . date('Y-m-d') . '.csv"',
        ];

        $callback = function () use ($refundRequests) {
            $file = fopen('php://output', 'w');
            
            // CSV header
            fputcsv($file, [
                'ID',
                'Booking Reference',
                'Customer Email',
                'Event Title',
                'Refund Amount',
                'Reason',
                'Status',
                'Requested At',
                'Processed At',
                'Processed By',
                'Refund Method',
            ]);

            // CSV data
            foreach ($refundRequests as $refundRequest) {
                fputcsv($file, [
                    $refundRequest->id,
                    $refundRequest->booking->booking_reference,
                    $refundRequest->booking->customer_email,
                    $refundRequest->booking->event->title,
                    $refundRequest->formatted_refund_amount,
                    $refundRequest->reason,
                    $refundRequest->status_label,
                    $refundRequest->created_at->format('Y-m-d H:i:s'),
                    $refundRequest->processed_at?->format('Y-m-d H:i:s'),
                    $refundRequest->approvedBy?->name,
                    $refundRequest->refund_method,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Get refund ineligibility reasons.
     * 
     * This helper method determines why a refund request might
     * not be eligible for approval.
     * 
     * @param RefundRequest $refundRequest
     * @return array
     */
    private function getRefundIneligibilityReasons(RefundRequest $refundRequest): array
    {
        $reasons = [];

        // Check if booking is confirmed
        if (!$refundRequest->booking->isConfirmed()) {
            $reasons[] = 'Booking is not confirmed';
        }

        // Check if event is more than 48 hours away
        if (!$refundRequest->booking->event->isMoreThan48HoursAway()) {
            $reasons[] = 'Event is less than 48 hours away';
        }

        // Check if already processed
        if ($refundRequest->isProcessed()) {
            $reasons[] = 'Refund request has already been processed';
        }

        // Check if event is cancelled
        if ($refundRequest->booking->event->status === 'cancelled') {
            $reasons[] = 'Event has been cancelled';
        }

        return $reasons;
    }
}
