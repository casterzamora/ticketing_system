<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PayMongoService
{
    public function isConfigured(): bool
    {
        return !empty(config('services.paymongo.secret_key'));
    }

    public function createCheckoutSession(Booking $booking): array
    {
        $secret = (string) config('services.paymongo.secret_key');
        $baseUrl = rtrim((string) config('services.paymongo.base_url', 'https://api.paymongo.com/v1'), '/');
        $verifySsl = filter_var(config('services.paymongo.verify_ssl', true), FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
        $verifySsl = $verifySsl ?? true;
        $appUrl = rtrim((string) config('app.url'), '/');
        $requestHostUrl = null;

        if (app()->bound('request')) {
            $request = app('request');
            if ($request && $request->getHost()) {
                $requestHostUrl = rtrim($request->getSchemeAndHttpHost(), '/');
            }
        }

        $returnBaseUrl = $requestHostUrl ?: $appUrl;

        if (empty($secret)) {
            throw new \RuntimeException('PayMongo secret key is not configured.');
        }

        $successUrl = $returnBaseUrl . '/user/bookings/' . $booking->id;
        $cancelUrl = $returnBaseUrl . '/user/checkout/' . $booking->id;

        $payload = [
            'data' => [
                'attributes' => [
                    'send_email_receipt' => true,
                    'show_description' => true,
                    'show_line_items' => true,
                    'line_items' => [
                        [
                            'currency' => 'PHP',
                            'amount' => (int) round(((float) $booking->total_amount) * 100),
                            'name' => 'Booking ' . $booking->booking_reference,
                            'quantity' => 1,
                        ],
                    ],
                    'payment_method_types' => ['gcash', 'paymaya', 'card'],
                    'description' => 'Ticket booking payment for ' . $booking->booking_reference,
                    'success_url' => $successUrl,
                    'cancel_url' => $cancelUrl,
                    'metadata' => [
                        'booking_id' => (string) $booking->id,
                        'booking_reference' => $booking->booking_reference,
                        'user_id' => (string) $booking->user_id,
                    ],
                ],
            ],
        ];

        $response = Http::withOptions([
            'verify' => $verifySsl,
        ])->retry(2, 500)->connectTimeout(10)->timeout(25)->withHeaders([
            'Authorization' => 'Basic ' . base64_encode($secret . ':'),
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->post($baseUrl . '/checkout_sessions', $payload);

        if (!$response->successful()) {
            Log::warning('PayMongo checkout session creation failed.', [
                'booking_id' => $booking->id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new \RuntimeException('Unable to create PayMongo checkout session.');
        }

        $data = $response->json('data') ?? [];
        $sessionId = Arr::get($data, 'id');
        $checkoutUrl = Arr::get($data, 'attributes.checkout_url');

        if (!$sessionId || !$checkoutUrl) {
            throw new \RuntimeException('Invalid PayMongo checkout session response.');
        }

        $booking->update([
            'external_session_id' => $sessionId,
        ]);

        $payment = Payment::updateOrCreate(
            ['booking_id' => $booking->id, 'status' => 'pending'],
            [
                'amount' => $booking->total_amount,
                'currency' => 'PHP',
                'status' => 'pending',
                'payment_method' => 'paymongo_checkout',
                'gateway' => 'PayMongo',
                'transaction_id' => $sessionId,
            ]
        );

        return [
            'session_id' => $sessionId,
            'checkout_url' => $checkoutUrl,
            'payment_id' => $payment->id,
        ];
    }

    public function createRefund(Payment $payment, float $amount, string $reason = 'Customer-requested refund'): array
    {
        $paymentId = $this->resolvePaymentIdForRefund($payment);
        if (!$paymentId) {
            throw new \RuntimeException('Unable to resolve PayMongo payment id for refund.');
        }

        $secret = (string) config('services.paymongo.secret_key');
        $baseUrl = rtrim((string) config('services.paymongo.base_url', 'https://api.paymongo.com/v1'), '/');
        $verifySsl = filter_var(config('services.paymongo.verify_ssl', true), FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
        $verifySsl = $verifySsl ?? true;

        if (empty($secret)) {
            throw new \RuntimeException('PayMongo secret key is not configured.');
        }

        $payload = [
            'data' => [
                'attributes' => [
                    'amount' => (int) round($amount * 100),
                    'payment_id' => $paymentId,
                    'notes' => $reason,
                ],
            ],
        ];

        $response = Http::withOptions([
            'verify' => $verifySsl,
        ])->retry(2, 500)->connectTimeout(10)->timeout(25)->withHeaders([
            'Authorization' => 'Basic ' . base64_encode($secret . ':'),
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->post($baseUrl . '/refunds', $payload);

        if (!$response->successful()) {
            Log::warning('PayMongo refund creation failed.', [
                'booking_id' => $payment->booking_id,
                'payment_id' => $payment->id,
                'paymongo_payment_id' => $paymentId,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            throw new \RuntimeException('Unable to create PayMongo refund.');
        }

        $data = $response->json('data') ?? [];
        $refundId = Arr::get($data, 'id');
        $refundStatus = strtolower((string) Arr::get($data, 'attributes.status', 'pending'));

        return [
            'refund_id' => $refundId,
            'status' => $refundStatus,
            'payment_id' => $paymentId,
            'raw' => $response->json() ?? [],
        ];
    }

    private function resolvePaymentIdForRefund(Payment $payment): ?string
    {
        if ($payment->gateway_transaction_id) {
            return (string) $payment->gateway_transaction_id;
        }

        $booking = $payment->booking;
        if (!$booking?->external_session_id) {
            return null;
        }

        $secret = (string) config('services.paymongo.secret_key');
        $baseUrl = rtrim((string) config('services.paymongo.base_url', 'https://api.paymongo.com/v1'), '/');
        $verifySsl = filter_var(config('services.paymongo.verify_ssl', true), FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
        $verifySsl = $verifySsl ?? true;

        if (empty($secret)) {
            return null;
        }

        $response = Http::withOptions([
            'verify' => $verifySsl,
        ])->retry(2, 500)->connectTimeout(10)->timeout(25)->withHeaders([
            'Authorization' => 'Basic ' . base64_encode($secret . ':'),
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->get($baseUrl . '/checkout_sessions/' . $booking->external_session_id);

        if (!$response->successful()) {
            return null;
        }

        $payload = $response->json() ?? [];
        $paymentId = Arr::get($payload, 'data.attributes.payments.0.id')
            ?? Arr::get($payload, 'data.attributes.payments.0.data.id')
            ?? Arr::get($payload, 'data.relationships.payments.data.0.id');

        if (!$paymentId) {
            return null;
        }

        $payment->gateway_transaction_id = (string) $paymentId;
        $payment->save();

        return (string) $paymentId;
    }

    public function handleWebhook(array $payload, ?string $signature = null): array
    {
        $eventType = (string) Arr::get($payload, 'data.attributes.type', 'unknown');

        $resource = Arr::get($payload, 'data.attributes.data', []);

        $sessionId = Arr::get($resource, 'id')
            ?? Arr::get($resource, 'attributes.checkout_session_id')
            ?? Arr::get($resource, 'attributes.reference_number');

        if (!$sessionId) {
            return [
                'handled' => false,
                'message' => 'No checkout session identifier in payload.',
                'event_type' => $eventType,
            ];
        }

        $booking = Booking::where('external_session_id', $sessionId)->first();

        if (!$booking) {
            return [
                'handled' => false,
                'message' => 'Booking not found for session.',
                'event_type' => $eventType,
                'session_id' => $sessionId,
            ];
        }

        $payment = Payment::firstOrCreate(
            ['booking_id' => $booking->id, 'transaction_id' => $sessionId],
            [
                'amount' => $booking->total_amount,
                'currency' => 'PHP',
                'status' => 'pending',
                'payment_method' => 'paymongo_checkout',
                'gateway' => 'PayMongo',
            ]
        );

        $successEvents = [
            'payment.paid',
            'checkout_session.payment.paid',
            'payment_intent.succeeded',
            'source.chargeable',
        ];

        $failureEvents = [
            'payment.failed',
            'checkout_session.payment.failed',
            'payment_intent.payment_failed',
            'payment.expired',
        ];

        if (in_array($eventType, $successEvents, true)) {
            if ($booking->status !== 'confirmed') {
                $payment->update([
                    'status' => 'successful',
                    'processed_at' => now(),
                    'gateway_response' => $payload,
                    'processor_response' => [
                        'event_type' => $eventType,
                        'signature_present' => !empty($signature),
                        'event_id' => Arr::get($payload, 'data.id', Str::uuid()->toString()),
                    ],
                ]);

                $booking->update([
                    'status' => 'confirmed',
                    'paid_at' => now(),
                ]);

                BookingService::generatePaidTickets($booking);
                DomainNotificationService::bookingPaid($booking);
                ActivityLogService::logPayment(
                    'successful',
                    $payment,
                    "Webhook confirmed payment for booking {$booking->booking_reference} ({$eventType})."
                );
            }

            return [
                'handled' => true,
                'message' => 'Payment marked as successful.',
                'event_type' => $eventType,
                'booking_id' => $booking->id,
            ];
        }

        if (in_array($eventType, $failureEvents, true)) {
            $payment->update([
                'status' => 'failed',
                'processed_at' => now(),
                'gateway_response' => $payload,
                'processor_response' => [
                    'event_type' => $eventType,
                    'signature_present' => !empty($signature),
                    'event_id' => Arr::get($payload, 'data.id', Str::uuid()->toString()),
                ],
            ]);

            DomainNotificationService::bookingPaymentFailed($booking, $eventType);
            DomainNotificationService::notifyAdmins(
                'payment.failed',
                'Payment Failure Detected',
                "A payment failed for booking {$booking->booking_reference}.",
                [
                    'booking_id' => $booking->id,
                    'booking_reference' => $booking->booking_reference,
                    'event_type' => $eventType,
                ]
            );
            ActivityLogService::logPayment(
                'failed',
                $payment,
                "Webhook marked payment as failed for booking {$booking->booking_reference} ({$eventType})."
            );

            return [
                'handled' => true,
                'message' => 'Payment marked as failed.',
                'event_type' => $eventType,
                'booking_id' => $booking->id,
            ];
        }

        return [
            'handled' => true,
            'message' => 'Webhook event recorded without status change.',
            'event_type' => $eventType,
            'booking_id' => $booking->id,
        ];
    }

    public function syncCheckoutStatus(Booking $booking): array
    {
        if (!$booking->external_session_id) {
            return [
                'handled' => false,
                'message' => 'No external checkout session to reconcile.',
            ];
        }

        if ($booking->status === 'confirmed') {
            return [
                'handled' => true,
                'message' => 'Booking already confirmed.',
                'status' => 'confirmed',
            ];
        }

        $secret = (string) config('services.paymongo.secret_key');
        $baseUrl = rtrim((string) config('services.paymongo.base_url', 'https://api.paymongo.com/v1'), '/');
        $verifySsl = filter_var(config('services.paymongo.verify_ssl', true), FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
        $verifySsl = $verifySsl ?? true;

        if (empty($secret)) {
            return [
                'handled' => false,
                'message' => 'PayMongo secret key is not configured.',
            ];
        }

        $response = Http::withOptions([
            'verify' => $verifySsl,
        ])->retry(2, 500)->connectTimeout(10)->timeout(25)->withHeaders([
            'Authorization' => 'Basic ' . base64_encode($secret . ':'),
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->get($baseUrl . '/checkout_sessions/' . $booking->external_session_id);

        if (!$response->successful()) {
            Log::warning('PayMongo checkout session reconciliation failed.', [
                'booking_id' => $booking->id,
                'session_id' => $booking->external_session_id,
                'status' => $response->status(),
                'body' => $response->json(),
            ]);

            return [
                'handled' => false,
                'message' => 'Unable to reconcile checkout session.',
            ];
        }

        $payload = $response->json() ?? [];
        $attributes = Arr::get($payload, 'data.attributes', []);

        $statusCandidates = array_filter([
            strtolower((string) Arr::get($attributes, 'status', '')),
            strtolower((string) Arr::get($attributes, 'payment_intent.status', '')),
            strtolower((string) Arr::get($attributes, 'payment_intent.attributes.status', '')),
            strtolower((string) Arr::get($attributes, 'payments.0.status', '')),
            strtolower((string) Arr::get($attributes, 'payments.0.attributes.status', '')),
            strtolower((string) Arr::get($payload, 'data.relationships.payment_intent.data.attributes.status', '')),
            strtolower((string) Arr::get($payload, 'data.relationships.payments.data.0.attributes.status', '')),
        ]);

        $paymentIntentIds = array_values(array_filter(array_unique([
            Arr::get($attributes, 'payment_intent.id'),
            Arr::get($attributes, 'payment_intent.data.id'),
            is_string(Arr::get($attributes, 'payment_intent')) ? Arr::get($attributes, 'payment_intent') : null,
            Arr::get($payload, 'data.relationships.payment_intent.data.id'),
            Arr::get($payload, 'data.attributes.payment_intent_id'),
        ])));

        foreach ($paymentIntentIds as $paymentIntentId) {
            try {
                $intentResponse = Http::withOptions([
                    'verify' => $verifySsl,
                ])->retry(2, 500)->connectTimeout(10)->timeout(25)->withHeaders([
                    'Authorization' => 'Basic ' . base64_encode($secret . ':'),
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])->get($baseUrl . '/payment_intents/' . $paymentIntentId);

                if ($intentResponse->successful()) {
                    $intentPayload = $intentResponse->json() ?? [];
                    $statusCandidates[] = strtolower((string) Arr::get($intentPayload, 'data.attributes.status', ''));
                }
            } catch (\Throwable $e) {
                Log::warning('PayMongo payment intent reconciliation fetch failed.', [
                    'booking_id' => $booking->id,
                    'payment_intent_id' => $paymentIntentId,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        $paymentIds = array_values(array_filter(array_unique([
            Arr::get($attributes, 'payments.0.id'),
            Arr::get($attributes, 'payments.0.data.id'),
            Arr::get($payload, 'data.relationships.payments.data.0.id'),
        ])));

        foreach ($paymentIds as $paymentId) {
            try {
                $paymentResponse = Http::withOptions([
                    'verify' => $verifySsl,
                ])->retry(2, 500)->connectTimeout(10)->timeout(25)->withHeaders([
                    'Authorization' => 'Basic ' . base64_encode($secret . ':'),
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])->get($baseUrl . '/payments/' . $paymentId);

                if ($paymentResponse->successful()) {
                    $paymentPayload = $paymentResponse->json() ?? [];
                    $statusCandidates[] = strtolower((string) Arr::get($paymentPayload, 'data.attributes.status', ''));
                }
            } catch (\Throwable $e) {
                Log::warning('PayMongo payment reconciliation fetch failed.', [
                    'booking_id' => $booking->id,
                    'payment_id' => $paymentId,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        $statusCandidates = array_values(array_filter(array_unique($statusCandidates)));

        $successStatuses = ['paid', 'successful', 'succeeded'];
        $failedStatuses = ['failed', 'cancelled', 'canceled', 'expired'];

        $payment = Payment::firstOrCreate(
            ['booking_id' => $booking->id, 'transaction_id' => $booking->external_session_id],
            [
                'amount' => $booking->total_amount,
                'currency' => 'PHP',
                'status' => 'pending',
                'payment_method' => 'paymongo_checkout',
                'gateway' => 'PayMongo',
            ]
        );

        $hasSuccess = count(array_intersect($successStatuses, $statusCandidates)) > 0;
        $hasFailure = count(array_intersect($failedStatuses, $statusCandidates)) > 0;

        if ($hasSuccess && $booking->status !== 'confirmed') {
            $payment->update([
                'status' => 'successful',
                'processed_at' => now(),
                'gateway_response' => $payload,
                'processor_response' => [
                    'event_type' => 'checkout_session.reconciled',
                    'status_candidates' => array_values($statusCandidates),
                ],
            ]);

            $booking->update([
                'status' => 'confirmed',
                'paid_at' => now(),
            ]);

            BookingService::generatePaidTickets($booking);
            DomainNotificationService::bookingPaid($booking);
            ActivityLogService::logPayment(
                'successful',
                $payment,
                "Reconciliation confirmed payment for booking {$booking->booking_reference}."
            );

            return [
                'handled' => true,
                'message' => 'Booking confirmed from checkout session reconciliation.',
                'status' => 'confirmed',
            ];
        }

        if ($hasFailure) {
            $payment->update([
                'status' => 'failed',
                'processed_at' => now(),
                'gateway_response' => $payload,
                'processor_response' => [
                    'event_type' => 'checkout_session.reconciled',
                    'status_candidates' => array_values($statusCandidates),
                ],
            ]);

            return [
                'handled' => true,
                'message' => 'Payment is not successful based on checkout session status.',
                'status' => 'failed',
            ];
        }

        return [
            'handled' => true,
            'message' => 'Checkout session status is still pending.',
            'status' => 'pending',
        ];
    }
}
