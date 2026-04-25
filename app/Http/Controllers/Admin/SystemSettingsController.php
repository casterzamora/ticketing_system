<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\PayMongoService;
use App\Services\SystemSettingsService;
use Illuminate\Http\Request;

class SystemSettingsController extends Controller
{
    public function policy()
    {
        return response()->json([
            'refund_require_successful_payment' => (bool) SystemSettingsService::get('refund_require_successful_payment', true),
            'refund_allowed_event_status' => (string) SystemSettingsService::get('refund_allowed_event_status', 'cancelled'),
            'reschedule_refund_window_hours' => (int) SystemSettingsService::get('reschedule_refund_window_hours', 72),
            'scanner_duplicate_window_seconds' => (int) SystemSettingsService::get('scanner_duplicate_window_seconds', 5),
            'inventory_low_stock_threshold_pct' => SystemSettingsService::fixedLowStockThresholdPct(),
        ]);
    }

    public function updatePolicy(Request $request)
    {
        $validated = $request->validate([
            'refund_require_successful_payment' => 'required|boolean',
            'refund_allowed_event_status' => 'required|in:cancelled,rescheduled,completed',
            'reschedule_refund_window_hours' => 'required|integer|min:1|max:336',
            'scanner_duplicate_window_seconds' => 'required|integer|min:1|max:30',
        ]);

        foreach ($validated as $key => $value) {
            SystemSettingsService::put($key, $value);
        }

        return response()->json([
            'message' => 'Operational policy settings updated.',
            'data' => $validated,
        ]);
    }

    public function paymentMode(PayMongoService $payMongoService)
    {
        $mode = (string) SystemSettingsService::get('payment_provider_mode', 'sandbox');

        return response()->json([
            'mode' => $mode,
            'available_modes' => ['sandbox', 'paymongo'],
            'paymongo_configured' => $payMongoService->isConfigured(),
        ]);
    }

    public function updatePaymentMode(Request $request, PayMongoService $payMongoService)
    {
        $validated = $request->validate([
            'mode' => 'required|in:sandbox,paymongo',
        ]);

        if ($validated['mode'] === 'paymongo' && !$payMongoService->isConfigured()) {
            return response()->json([
                'message' => 'Cannot switch to PayMongo mode while credentials are not configured.',
            ], 422);
        }

        SystemSettingsService::put('payment_provider_mode', $validated['mode']);

        return response()->json([
            'message' => 'Payment provider mode updated.',
            'mode' => $validated['mode'],
        ]);
    }

    public function paymentHealth(PayMongoService $payMongoService)
    {
        $mode = (string) SystemSettingsService::get('payment_provider_mode', 'sandbox');

        return response()->json([
            'mode' => $mode,
            'sandbox_ready' => true,
            'paymongo_configured' => $payMongoService->isConfigured(),
            'ready' => $mode === 'sandbox' || $payMongoService->isConfigured(),
        ]);
    }
}
