<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NotificationLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserNotificationController extends Controller
{
    public function index(Request $request)
    {
        $limit = max(5, min((int) $request->get('limit', 20), 100));

        $rows = NotificationLog::query()
            ->where('user_id', Auth::id())
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'event_key' => $row->event_key,
                'title' => $row->title,
                'body' => $row->body,
                'payload' => $row->payload,
                'booking_id' => $row->booking_id,
                'read_at' => $row->read_at?->toIso8601String(),
                'created_at' => $row->created_at?->toIso8601String(),
            ]);

        return response()->json([
            'data' => $rows,
            'unread_count' => NotificationLog::query()
                ->where('user_id', Auth::id())
                ->whereNull('read_at')
                ->count(),
        ]);
    }

    public function markRead(NotificationLog $notification)
    {
        if ((int) $notification->user_id !== (int) Auth::id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (is_null($notification->read_at)) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllRead()
    {
        NotificationLog::query()
            ->where('user_id', Auth::id())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json([
            'message' => 'All notifications marked as read.',
            'unread_count' => 0,
        ]);
    }
}
