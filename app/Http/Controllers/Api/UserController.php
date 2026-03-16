<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    /**
     * Return the authenticated user's info.
     */
    public function user(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'phone'      => $user->phone,
            'is_admin'   => $user->isAdmin(),
            'is_active'  => $user->is_active,
            'created_at' => $user->created_at?->toIso8601String(),
        ]);
    }

    /**
     * Admin – list all users.
     */
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) => $q->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%"));
        }

        if ($request->filled('role')) {
            $query->role($request->role);
        }

        $users = $query->orderByDesc('created_at')->paginate(20);

        return response()->json([
            'data' => $users->map(fn ($u) => [
                'id'         => $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'phone'      => $u->phone,
                'is_admin'   => $u->isAdmin(),
                'is_active'  => $u->is_active,
                'created_at' => $u->created_at?->toIso8601String(),
                'bookings_count' => $u->bookings()->count(),
            ]),
            'total'        => $users->total(),
            'current_page' => $users->currentPage(),
            'last_page'    => $users->lastPage(),
        ]);
    }

    /**
     * Admin – toggle user active status.
     */
    public function toggleActive(User $user)
    {
        // Cannot deactivate yourself
        if ($user->id === Auth::id()) {
            return response()->json(['message' => 'Cannot deactivate self.'], 422);
        }

        $user->update(['is_active' => !$user->is_active]);

        return response()->json([
            'message'   => 'Status updated.',
            'is_active' => $user->is_active,
        ]);
    }

    /**
     * Admin – assign role to user.
     */
    public function assignRole(Request $request, User $user)
    {
        $request->validate(['role' => 'required|in:admin,user']);

        $user->syncRoles([$request->role]);

        return response()->json(['message' => 'Role assigned.', 'role' => $request->role]);
    }

    /**
     * Admin – view a specific user's bookings.
     */
    public function bookings(User $user)
    {
        $bookings = $user->bookings()
            ->with(['event', 'bookingTickets.ticketType'])
            ->latest()
            ->get();

        return response()->json(['data' => $bookings]);
    }
}
