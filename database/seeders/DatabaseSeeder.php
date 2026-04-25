<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use App\Models\EventCategory;
use Illuminate\Support\Facades\Hash;

/**
 * Database Seeder
 * 
 * This seeder sets up the initial data for the ticketing system including:
 * - Roles and permissions
 * - Default admin user
 * - Event categories
 * - Sample data for testing
 */
class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * 
     * This method creates the initial data required for the system
     * to function properly.
     */
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            EventCategorySeeder::class,
            UserSeeder::class,
        ]);
    }
}

/**
 * Role and Permission Seeder
 * 
 * Creates the roles and permissions required for the system.
 */
class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Create roles
        $adminRole = Role::firstOrCreate(['name' => 'admin']);
        $userRole = Role::firstOrCreate(['name' => 'user']);

        // Create permissions for admin
        $permissions = [
            'events.create',
            'events.edit',
            'events.delete',
            'events.publish',
            'events.cancel',
            'ticket-types.create',
            'ticket-types.edit',
            'ticket-types.delete',
            'bookings.view',
            'bookings.cancel',
            'refunds.approve',
            'refunds.reject',
            'reports.view',
            'users.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Assign all permissions to admin role
        $adminRole->givePermissionTo(Permission::all());

        // Assign basic permissions to user role
        $userPermissions = [
            'events.view',
            'bookings.create',
            'bookings.view',
            'bookings.cancel',
            'refunds.request',
        ];

        foreach ($userPermissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $userRole->givePermissionTo($userPermissions);
    }
}

/**
 * Event Category Seeder
 * 
 * Creates default event categories for the system.
 */
class EventCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Concerts',
                'slug' => 'concerts',
                'description' => 'Live music performances and concerts',
                'color' => '#8B5CF6',
                'sort_order' => 1,
            ],
            [
                'name' => 'Sports',
                'slug' => 'sports',
                'description' => 'Sporting events and competitions',
                'color' => '#EF4444',
                'sort_order' => 2,
            ],
            [
                'name' => 'Theater',
                'slug' => 'theater',
                'description' => 'Theatrical performances and plays',
                'color' => '#F59E0B',
                'sort_order' => 3,
            ],
            [
                'name' => 'Comedy',
                'slug' => 'comedy',
                'description' => 'Stand-up comedy and comedy shows',
                'color' => '#10B981',
                'sort_order' => 4,
            ],
            [
                'name' => 'Conferences',
                'slug' => 'conferences',
                'description' => 'Business conferences and seminars',
                'color' => '#3B82F6',
                'sort_order' => 5,
            ],
            [
                'name' => 'Workshops',
                'slug' => 'workshops',
                'description' => 'Educational workshops and training',
                'color' => '#EC4899',
                'sort_order' => 6,
            ],
            [
                'name' => 'Festivals',
                'slug' => 'festivals',
                'description' => 'Music and cultural festivals',
                'color' => '#14B8A6',
                'sort_order' => 7,
            ],
            [
                'name' => 'Exhibitions',
                'slug' => 'exhibitions',
                'description' => 'Art exhibitions and trade shows',
                'color' => '#6366F1',
                'sort_order' => 8,
            ],
        ];

        foreach ($categories as $category) {
            EventCategory::firstOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}

/**
 * User Seeder
 * 
 * Creates default users for testing and demonstration.
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin user
        $admin = User::updateOrCreate(
            ['email' => 'admin@ticketing.com'],
            [
                'name' => 'System Administrator',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'password' => Hash::make('password'),
                'is_active' => true,
            ]
        );

        $admin->assignRole('admin');

        // Create test customer users
        $customers = [
            [
                'name' => 'John Doe',
                'first_name' => 'John',
                'last_name' => 'Doe',
                'email' => 'john@example.com',
                'password' => Hash::make('password'),
            ],
            [
                'name' => 'Jane Smith',
                'first_name' => 'Jane',
                'last_name' => 'Smith',
                'email' => 'jane@example.com',
                'password' => Hash::make('password'),
            ],
            [
                'name' => 'Bob Johnson',
                'first_name' => 'Bob',
                'last_name' => 'Johnson',
                'email' => 'bob@example.com',
                'password' => Hash::make('password'),
            ],
        ];

        foreach ($customers as $customerData) {
            $customer = User::updateOrCreate(
                ['email' => $customerData['email']],
                array_merge($customerData, ['is_active' => true])
            );
            $customer->assignRole('user');
        }
    }
}
