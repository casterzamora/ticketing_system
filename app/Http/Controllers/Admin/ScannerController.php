<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Ticket;
use App\Services\DomainNotificationService;
use App\Services\SystemSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ScannerController extends Controller
{
    /**
     * Validate and Check-In a booking via reference.
     * This is the endpoint used by the QR scanner.
     */
    public function checkIn(Request $request)
    {
        $validated = $request->validate([
            'reference' => 'required|string|max:255'
        ]);

        $raw = $this->extractPayloadValue((string) $validated['reference']);
        $scanTarget = $this->resolveScanTarget($raw);

        if (!$scanTarget) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid QR payload format.',
                'type' => 'error',
            ], 422);
        }

        $cooldown = (int) SystemSettingsService::get('scanner_duplicate_window_seconds', 5);
        $cooldownKey = 'scanner:' . $scanTarget['cooldown_key'];
        if (!Cache::add($cooldownKey, now()->toIso8601String(), now()->addSeconds($cooldown))) {
            return response()->json([
                'success' => false,
                'message' => 'Duplicate scan detected. Please wait a few seconds before retrying.',
                'type' => 'duplicate',
                'data' => [
                    'reference' => $scanTarget['booking']->booking_reference,
                ]
            ], 429);
        }

        $booking = $scanTarget['booking'];

        // 1. Check Status
        if ($booking->status !== 'confirmed') {
            return response()->json([
                'success' => false,
                'message' => "Invalid: This booking is currently {$booking->status}.",
                'type' => 'error'
            ], 422);
        }

        $ticket = $scanTarget['ticket'];
        $alreadyCheckedInCount = $booking->tickets()->whereNotNull('checked_in_at')->count();

        if ($ticket->checked_in_at) {
            return response()->json([
                'success' => false,
                'message' => 'ALREADY CHECKED IN: Ticket already used at ' . $ticket->checked_in_at->format('h:i A'),
                'type' => 'duplicate',
                'data' => [
                    'name' => $booking->customer_name,
                    'reference' => $booking->booking_reference,
                    'ticket_code' => $ticket->ticket_code,
                    'time' => $ticket->checked_in_at->format('h:i A'),
                ]
            ], 422);
        }

        // 2. Process check-in at ticket level
        $ticket->checked_in_at = now();
        $ticket->save();

        $checkedInCount = $booking->tickets()->whereNotNull('checked_in_at')->count();
        $totalTickets = $booking->tickets()->count();
        $allCheckedIn = $totalTickets > 0 && $checkedInCount >= $totalTickets;

        if ($allCheckedIn && !$booking->checked_in_at) {
            $booking->checked_in_at = now();
            $booking->save();
        }

        // Notify once per booking (first successful gate entry) to avoid email spam.
        if ($alreadyCheckedInCount === 0) {
            DomainNotificationService::scannerCheckIn($booking);
        }

        \App\Services\ActivityLogService::log('updated', $booking, "QR SCAN: Ticket {$ticket->ticket_code} checked in for {$booking->customer_name}");

        return response()->json([
            'success' => true,
            'message' => "WELCOME: {$booking->customer_name}!",
            'data' => [
                'name' => $booking->customer_name,
                'reference' => $booking->booking_reference,
                'ticket_code' => $ticket->ticket_code,
                'time' => $ticket->checked_in_at?->format('h:i A'),
                'checked_in_count' => $checkedInCount,
                'total_tickets' => $totalTickets,
                'fully_checked_in' => $allCheckedIn,
            ]
        ]);
    }

    private function extractPayloadValue(string $raw): string
    {
        $value = trim($raw);

        if (str_contains($value, '/')) {
            $parts = explode('/', $value);
            $value = trim((string) end($parts));
        }

        return strtoupper($value);
    }

    private function resolveScanTarget(string $raw): ?array
    {
        if (preg_match('/TKT-[A-Z0-9]+-[A-Z0-9]+/', $raw, $ticketMatch)) {
            $ticketCode = strtoupper($ticketMatch[0]);
            $ticket = Ticket::with('booking')->where('ticket_code', $ticketCode)->first();
            if ($ticket && $ticket->booking) {
                return [
                    'booking' => $ticket->booking,
                    'ticket' => $ticket,
                    'cooldown_key' => $ticketCode,
                ];
            }
        }

        if (preg_match('/BK-\d{4}-[A-Z0-9]+/', $raw, $bookingMatch)) {
            $reference = strtoupper($bookingMatch[0]);
            $booking = Booking::with('tickets')->where('booking_reference', $reference)->first();
            if (!$booking) {
                return null;
            }

            $nextTicket = $booking->tickets->firstWhere('checked_in_at', null);
            if (!$nextTicket) {
                $lastTicket = $booking->tickets->sortByDesc('checked_in_at')->first();
                if (!$lastTicket) {
                    return null;
                }

                return [
                    'booking' => $booking,
                    'ticket' => $lastTicket,
                    'cooldown_key' => $reference,
                ];
            }

            return [
                'booking' => $booking,
                'ticket' => $nextTicket,
                'cooldown_key' => $reference,
            ];
        }

        return null;
    }
}
