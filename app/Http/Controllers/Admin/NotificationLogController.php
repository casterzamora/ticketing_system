<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationLog;
use Illuminate\Http\Request;

class NotificationLogController extends Controller
{
    public function index(Request $request)
    {
        $query = NotificationLog::query()
            ->with([
                'user:id,name,email',
                'booking:id,booking_reference',
            ])
            ->latest();

        if ($request->filled('search')) {
            $search = (string) $request->search;

            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%")
                    ->orWhere('event_key', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('booking', function ($bq) use ($search) {
                        $bq->where('booking_reference', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('channel')) {
            $query->where('channel', (string) $request->channel);
        }

        if ($request->filled('event_key')) {
            $query->where('event_key', (string) $request->event_key);
        }

        $logs = $query->paginate(25);

        return response()->json([
            'data' => $logs->getCollection()->map(function (NotificationLog $log) {
                return [
                    'id' => $log->id,
                    'event_key' => $log->event_key,
                    'channel' => $log->channel,
                    'title' => $log->title,
                    'body' => $log->body,
                    'payload' => $log->payload,
                    'sent_at' => $log->sent_at?->toIso8601String(),
                    'created_at' => $log->created_at?->toIso8601String(),
                    'user' => $log->user ? [
                        'id' => $log->user->id,
                        'name' => $log->user->name,
                        'email' => $log->user->email,
                    ] : null,
                    'booking' => $log->booking ? [
                        'id' => $log->booking->id,
                        'booking_reference' => $log->booking->booking_reference,
                    ] : null,
                ];
            })->values(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
