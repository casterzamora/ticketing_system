<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Ticket - {{ $booking->booking_reference }}</title>
    <style>
        body { font-family: DejaVu Sans, Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 24px; color: #111827; }
        .ticket-shell { max-width: 780px; margin: 0 auto; }
        .ticket { background: #ffffff; border: 1px solid #d1d5db; }
        .header { background: #0f172a; color: #f8fafc; padding: 20px 24px; }
        .brand { font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; color: #94a3b8; }
        .title { font-size: 26px; margin-top: 8px; font-weight: 700; }
        .subtitle { font-size: 12px; color: #cbd5e1; margin-top: 6px; }
        .hero { padding: 16px 24px; border-bottom: 1px solid #e5e7eb; background: #f8fafc; }
        .event-name { font-size: 24px; font-weight: 700; margin: 0 0 6px 0; }
        .event-meta { font-size: 13px; color: #374151; margin: 0; }
        .grid { width: 100%; border-collapse: collapse; }
        .grid td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.9px; color: #6b7280; margin-bottom: 3px; }
        .value { font-size: 13px; color: #111827; font-weight: 600; }
        .content { padding: 0 24px 16px 24px; }
        .section-title { margin: 18px 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #334155; }
        .ticket-list { width: 100%; border-collapse: collapse; }
        .ticket-list th { background: #111827; color: #f9fafb; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; padding: 8px; }
        .ticket-list td { border: 1px solid #e5e7eb; font-size: 12px; padding: 8px; }
        .ticket-list .qr-cell { width: 140px; text-align: center; }
        .mono { font-family: DejaVu Sans Mono, monospace; letter-spacing: 0.5px; }
        .qr-wrap { display: inline-block; width: 96px; height: 96px; border: 1px solid #cbd5e1; padding: 4px; background: #fff; }
        .qr-meta { font-size: 9px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
        .note { margin-top: 12px; padding: 10px; border: 1px dashed #94a3b8; background: #f8fafc; font-size: 11px; color: #334155; }
        .footer { border-top: 1px solid #e5e7eb; padding: 12px 24px 18px 24px; font-size: 10px; color: #6b7280; }
    </style>
</head>
<body>
    @php
        $ticketRows = $booking->tickets ?? collect();
        $primaryTicket = $ticketRows->first();
        $payment = $booking->payments->where('status', 'successful')->sortByDesc('processed_at')->first() ?? $booking->payments->first();
        $issuedAt = $booking->paid_at ?: $booking->created_at;
        $eventDate = $booking->event?->start_time ? \Carbon\Carbon::parse($booking->event->start_time)->format('F d, Y h:i A') : 'TBA';
        $amountPhp = 'PHP ' . number_format((float) $booking->total_amount, 2);
        $qrMap = [];
        foreach ($ticketRows as $ticket) {
            $code = (string) ($ticket->ticket_code ?? '');
            $qrMap[$code] = \App\Services\TicketQrService::dataUriForPayload($code, 140);
        }
    @endphp

    <div class="ticket-shell">
        <div class="ticket">
            <div class="header">
                <div class="brand">Live Tix Official Entry Pass</div>
                <div class="title">Event Admission Ticket</div>
                <div class="subtitle">This document must be presented at the venue gate.</div>
            </div>

            <div class="hero">
                <p class="event-name">{{ $booking->event->title ?? 'Event Name' }}</p>
                <p class="event-meta">{{ $eventDate }} | {{ $booking->event->location ?? 'Venue TBA' }}</p>
            </div>

            <div class="content">
                <table class="grid">
                    <tr>
                        <td width="33%">
                            <div class="label">Booking Reference</div>
                            <div class="value mono">{{ $booking->booking_reference }}</div>
                        </td>
                        <td width="33%">
                            <div class="label">Primary Ticket Number</div>
                            <div class="value mono">{{ $primaryTicket?->ticket_code ?? 'ISSUING-SOON' }}</div>
                        </td>
                        <td width="34%">
                            <div class="label">Issued At</div>
                            <div class="value">{{ $issuedAt ? $issuedAt->format('F d, Y h:i A') : now()->format('F d, Y h:i A') }}</div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div class="label">Passenger Name</div>
                            <div class="value">{{ $booking->customer_name ?? $booking->user?->name ?? 'Guest' }}</div>
                        </td>
                        <td>
                            <div class="label">Customer Email</div>
                            <div class="value">{{ $booking->customer_email ?? $booking->user?->email ?? 'N/A' }}</div>
                        </td>
                        <td>
                            <div class="label">Total Paid</div>
                            <div class="value">{{ $amountPhp }}</div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div class="label">Total Seats</div>
                            <div class="value">{{ $booking->total_tickets }}</div>
                        </td>
                        <td>
                            <div class="label">Booking Status</div>
                            <div class="value">{{ strtoupper($booking->status) }}</div>
                        </td>
                        <td>
                            <div class="label">Payment Method</div>
                            <div class="value">{{ $payment?->payment_method ?? 'N/A' }}</div>
                        </td>
                    </tr>
                </table>

                <p class="section-title">Issued Ticket Numbers</p>
                <table class="ticket-list">
                    <thead>
                        <tr>
                            <th width="12%">#</th>
                            <th width="33%">Ticket Number</th>
                            <th width="22%">Ticket Type</th>
                            <th width="14%">Status</th>
                            <th width="19%">Scan QR</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($ticketRows as $index => $ticket)
                            <tr>
                                <td>{{ $index + 1 }}</td>
                                <td class="mono">{{ $ticket->ticket_code }}</td>
                                <td>{{ $ticket->ticketType?->name ?? 'General' }}</td>
                                <td>{{ $ticket->checked_in_at ? 'Used' : 'Valid' }}</td>
                                <td class="qr-cell">
                                    @if(!empty($qrMap[$ticket->ticket_code]))
                                        <div class="qr-wrap">
                                            <img src="{{ $qrMap[$ticket->ticket_code] }}" alt="QR for {{ $ticket->ticket_code }}" width="90" height="90" />
                                        </div>
                                        <div class="qr-meta">Scan at Gate</div>
                                    @else
                                        <span class="qr-meta">Unavailable</span>
                                    @endif
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td>1</td>
                                <td class="mono">ISSUING-SOON</td>
                                <td>Pending</td>
                                <td>Pending</td>
                                <td class="qr-cell">-</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>

                <div class="note">
                    Entry rules: Bring a valid ID that matches the passenger name. Booking Reference and Ticket Number are separate identifiers and may both be requested by staff during verification.
                </div>
            </div>

            <div class="footer">
                Generated on {{ now()->format('Y-m-d H:i:s') }} | Live Tix Ticketing Platform
            </div>
        </div>
    </div>
</body>
</html>