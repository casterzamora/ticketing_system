<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\View\View;

class EventController extends Controller
{
    public function index(Request $request): View
    {
        $query = Event::with(['categories'])
            ->published()
            ->active()
            ->upcoming();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('venue', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $events = $query->orderBy('start_time')->paginate(12);
        $featured = (clone $query)->featured()->first() ?? $events->first();

        return view('events.index', compact('events', 'featured'));
    }

    public function show(Event $event): View
    {
        $event->load(['categories', 'activeTicketTypes']);

        return view('events.show', compact('event'));
    }
}
