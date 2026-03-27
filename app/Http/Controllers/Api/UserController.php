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
            'id'             => $user->id,
            'name'           => $user->name,
            'username'       => $user->username,
            'first_name'     => $user->first_name,
            'last_name'      => $user->last_name,
            'email'          => $user->email,
            'phone'          => $user->phone,
            'is_admin'       => $user->isAdmin(),
            'is_active'      => $user->is_active,
            'created_at'     => $user->created_at?->toIso8601String(),
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
                'username'   => $u->username,
                'first_name' => $u->first_name,
                'last_name'  => $u->last_name,
                'email'      => $u->email,
                'phone'      => $u->phone,
                'is_admin'   => $u->isAdmin(),
                'is_active'  => $u->is_active,
                'last_login_at' => $u->last_login_at?->toIso8601String(),
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

        // Cannot change own role
        if ($user->id === Auth::id()) {
            return response()->json(['message' => 'Cannot change your own role.'], 422);
        }

        $user->syncRoles([$request->role]);

        return response()->json(['message' => 'Role assigned.', 'role' => $request->role]);
    }

    /**
     * Admin – view a specific user's detailed profile and logs.
     */
    public function show(User $user)
    {
        $user->loadCount('bookings');
        
        return response()->json([
            'id'             => $user->id,
            'name'           => $user->name,
            'email'          => $user->email,
            'phone'          => $user->phone,
            'is_admin'       => $user->isAdmin(),
            'is_active'      => $user->is_active,
            'created_at'     => $user->created_at?->toIso8601String(),
            'bookings_count' => $user->bookings_count,
            'recent_activity' => \App\Models\ActivityLog::where('user_id', $user->id)
                ->latest()
                ->take(10)
                ->get(),
        ]);
    }

    /**
     * Update the authenticated user's profile or an admin updates any user.
     */
    public function update(Request $request, User $user = null)
    {
        // If no user provided, assume we're updating the authenticated user
        $targetUser = $user ?: $request->user();

        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'username'         => 'nullable|string|max:255|unique:users,username,' . $targetUser->id,
            'first_name'       => 'nullable|string|max:255',
            'last_name'        => 'nullable|string|max:255',
            'email'            => 'required|email|unique:users,email,' . $targetUser->id,
            'phone'            => 'nullable|string|max:20',
            'current_password' => 'nullable|required_with:new_password',
            'new_password'     => 'nullable|min:8|confirmed',
        ]);

        $targetUser->name = $validated['name'];
        $targetUser->username = $validated['username'] ?? $targetUser->username;
        $targetUser->first_name = $validated['first_name'] ?? $targetUser->first_name;
        $targetUser->last_name = $validated['last_name'] ?? $targetUser->last_name;
        $targetUser->email = $validated['email'];
        $targetUser->phone = $request->input('phone', $targetUser->phone);

        // Security check for password change
        if ($request->filled('new_password')) {
            if (!\Illuminate\Support\Facades\Hash::check($request->current_password, $targetUser->password)) {
                return response()->json(['message' => 'Current password verification failed.'], 422);
            }
            $targetUser->password = \Illuminate\Support\Facades\Hash::make($request->new_password);
        }

        $targetUser->name = $validated['name'];
        $targetUser->email = $validated['email'];
        if (isset($validated['phone'])) {
            $targetUser->phone = $validated['phone'];
        }
        
        $targetUser->save();

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user'    => $targetUser
        ]);
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
