<?php

namespace App\Services;

use App\Models\SystemSetting;

class SystemSettingsService
{
    public const FIXED_LOW_STOCK_THRESHOLD_PCT = 85;

    private const DEFAULTS = [
        'refund_require_successful_payment' => true,
        'refund_allowed_event_status' => 'cancelled',
        'reschedule_refund_window_hours' => 72,
        'scanner_duplicate_window_seconds' => 5,
        'inventory_low_stock_threshold_pct' => self::FIXED_LOW_STOCK_THRESHOLD_PCT,
        'payment_provider_mode' => 'sandbox',
    ];

    public static function fixedLowStockThresholdPct(): int
    {
        return self::FIXED_LOW_STOCK_THRESHOLD_PCT;
    }

    public static function defaults(): array
    {
        return self::DEFAULTS;
    }

    public static function get(string $key, mixed $fallback = null): mixed
    {
        $record = SystemSetting::where('key', $key)->first();

        if (!$record) {
            return self::DEFAULTS[$key] ?? $fallback;
        }

        return match ($record->type) {
            'int' => (int) $record->value,
            'float' => (float) $record->value,
            'bool' => filter_var($record->value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? false,
            'json' => json_decode((string) $record->value, true),
            default => $record->value,
        };
    }

    public static function put(string $key, mixed $value): SystemSetting
    {
        $type = match (true) {
            is_bool($value) => 'bool',
            is_int($value) => 'int',
            is_float($value) => 'float',
            is_array($value) => 'json',
            default => 'string',
        };

        $storedValue = is_array($value) ? json_encode($value) : (string) $value;

        return SystemSetting::updateOrCreate(
            ['key' => $key],
            ['value' => $storedValue, 'type' => $type]
        );
    }
}
