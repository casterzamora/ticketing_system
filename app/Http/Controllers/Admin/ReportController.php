<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Event;
use App\Models\RefundRequest;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /**
     * Export sales report as CSV.
     */
    public function sales(Request $request)
    {
        $bookings = Booking::with(['event', 'user', 'bookingTickets.ticketType'])
            ->where('status', 'confirmed')
            ->latest()
            ->get();

        $response = new StreamedResponse(function () use ($bookings) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Booking Ref', 'Event', 'Customer', 'Email', 'Tickets', 'Amount (PHP)', 'Date']);

            foreach ($bookings as $booking) {
                fputcsv($handle, [
                    $booking->booking_reference,
                    $booking->event->title ?? 'N/A',
                    $booking->customer_name,
                    $booking->customer_email,
                    $booking->total_tickets,
                    $booking->total_amount,
                    $booking->created_at->format('Y-m-d H:i')
                ]);
            }

            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="sales_report_' . date('Ymd') . '.csv"');

        return $response;
    }

    /**
     * Export refund requests as CSV.
     */
    public function refunds(Request $request)
    {
        $refunds = RefundRequest::with(['booking.event', 'booking.user'])
            ->latest()
            ->get();

        $response = new StreamedResponse(function () use ($refunds) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Booking Ref', 'Event', 'User', 'Amount', 'Reason', 'Status', 'Date']);

            foreach ($refunds as $refund) {
                fputcsv($handle, [
                    $refund->id,
                    $refund->booking->booking_reference ?? 'N/A',
                    $refund->booking->event->title ?? 'N/A',
                    $refund->booking->user->name ?? 'N/A',
                    $refund->refund_amount,
                    $refund->reason,
                    $refund->status,
                    $refund->created_at->format('Y-m-d H:i')
                ]);
            }

            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv');
        $response->headers->set('Content-Disposition', 'attachment; filename="refund_report_' . date('Ymd') . '.csv"');

        return $response;
    }

    /**
     * Get popular events analysis data.
     */
    public function popularEvents()
    {
        $events = Event::withCount('confirmedBookings')
            ->orderBy('confirmed_bookings_count', 'desc')
            ->limit(10)
            ->get(['id', 'title', 'max_capacity']);

        return response()->json($events);
    }
}
