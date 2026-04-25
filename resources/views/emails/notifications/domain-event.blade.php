<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title }}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="620" cellspacing="0" cellpadding="0" style="width:620px;max-width:94%;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;box-shadow:0 8px 30px rgba(17,24,39,0.06);">
                    <tr>
                        <td style="padding:14px 20px;background:#0f172a;color:#e5e7eb;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;">
                            Live Tix · {{ $label }}
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:22px 20px 0 20px;">
                            <div style="height:4px;background:{{ $accentColor }};border-radius:999px;"></div>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:22px 20px 14px 20px;">
                            <p style="margin:0 0 10px 0;font-size:15px;line-height:1.5;">Hello {{ $recipientName ?: 'there' }},</p>
                            <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.25;color:#111827;">{{ $title }}</h1>
                            @if(!empty($body))
                                <p style="margin:0 0 14px 0;font-size:14px;line-height:1.65;color:#374151;">{{ $body }}</p>
                            @endif

                            @if(!empty($bookingReference))
                                <p style="margin:0 0 14px 0;font-size:13px;color:#4b5563;">
                                    <strong>Booking Reference:</strong> {{ $bookingReference }}
                                </p>
                            @endif

                            @if(!empty($actionUrl))
                                <p style="margin:0 0 16px 0;">
                                    <a href="{{ $actionUrl }}" style="display:inline-block;background:{{ $accentColor }};color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:10px;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;">
                                        {{ $actionText }}
                                    </a>
                                </p>
                            @endif

                            @if(!empty($secondaryText))
                                <p style="margin:0 0 16px 0;font-size:12px;line-height:1.6;color:#4b5563;">
                                    {{ $secondaryText }}
                                </p>
                            @endif

                            @if(!empty($ticketAttached))
                                <p style="margin:0 0 16px 0;font-size:12px;color:#374151;background:#ecfdf5;border:1px solid #86efac;padding:10px 12px;border-radius:10px;">
                                    Your virtual ticket PDF is attached to this email.
                                </p>
                            @endif

                            @if(!empty($details))
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:8px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                                    @foreach($details as $label => $value)
                                        <tr>
                                            <td style="padding:9px 12px;background:#f9fafb;font-size:12px;color:#6b7280;width:42%;border-bottom:1px solid #e5e7eb;">{{ $label }}</td>
                                            <td style="padding:9px 12px;background:#ffffff;font-size:12px;color:#111827;border-bottom:1px solid #e5e7eb;">{{ $value }}</td>
                                        </tr>
                                    @endforeach
                                </table>
                            @endif
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:14px 20px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:11px;line-height:1.6;color:#6b7280;">
                            This is an automated transactional message from Live Tix. You can also review this update from your in-app notifications.
                            <br>
                            For account support, contact <a href="mailto:{{ config('mail.from.address') }}" style="color:#334155;text-decoration:none;">{{ config('mail.from.address') }}</a>.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
