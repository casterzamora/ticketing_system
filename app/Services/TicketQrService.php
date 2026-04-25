<?php

namespace App\Services;

use BaconQrCode\Renderer\GDLibRenderer;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class TicketQrService
{
    public static function svgForPayload(?string $payload, int $size = 160): ?string
    {
        $value = trim((string) $payload);
        if ($value === '') {
            return null;
        }

        $renderer = new ImageRenderer(
            new RendererStyle($size, 1),
            new SvgImageBackEnd()
        );

        $writer = new Writer($renderer);

        return $writer->writeString($value);
    }

    /**
     * Generate a QR code as a data URI for reliable embedding in PDF views.
     * Prefers PNG output (best DomPDF compatibility), falls back to SVG data URI.
     */
    public static function dataUriForPayload(?string $payload, int $size = 160): ?string
    {
        $value = trim((string) $payload);
        if ($value === '') {
            return null;
        }

        try {
            $pngWriter = new Writer(new GDLibRenderer($size, 1, 'png'));
            $png = $pngWriter->writeString($value);

            return 'data:image/png;base64,' . base64_encode($png);
        } catch (\Throwable) {
            $svg = self::svgForPayload($value, $size);
            if (!$svg) {
                return null;
            }

            return 'data:image/svg+xml;base64,' . base64_encode($svg);
        }
    }
}
