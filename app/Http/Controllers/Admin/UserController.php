<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;

class UserController extends Controller
{
    /**
     * Admin – list all users.
     */
    public function index(Request $request)
    {
        $query = User::withCount('bookings')->orderByDesc('created_at');

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(fn ($q) =>
                $q->where('name', 'like', "%$s%")->orWhere('email', 'like', "%$s%")
            );
        }

        if ($request->filled('role')) {
            $query->role($request->role);
        }

        $users = $query->paginate(20);

        return view('admin.users.index', compact('users'));
    }

    /**
     * Admin – show a user.
     */
    public function show(User $user)
    {
        $user->load(['bookings.event']);

        return view('admin.users.show', compact('user'));
    }

    /**
     * Admin – toggle active status.
     */
    public function toggleActive(User $user)
    {
        if ($user->id === auth()->id()) {
            return back()->with('error', 'You cannot deactivate your own account.');
        }

        $user->update(['is_active' => !$user->is_active]);

        $status = $user->is_active ? 'activated' : 'deactivated';
        ActivityLogService::log($status, $user, "Admin {$status} user {$user->email}");

        return back()->with('success', "User account {$status}.");
    }

    /**
     * Admin – assign role.
     */
    public function assignRole(Request $request, User $user)
    {
        $request->validate(['role' => 'required|in:admin,user']);

        $user->syncRoles([$request->role]);

        ActivityLogService::log('role_assigned', $user, "Admin assigned role '{$request->role}' to {$user->email}");

        return back()->with('success', "Role '{$request->role}' assigned.");
    }
}
