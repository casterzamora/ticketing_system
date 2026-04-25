<?php

namespace Tests\Feature\Api;

use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class EventApiTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
    }

    public function test_admin_can_create_event_with_valid_data()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/admin/events', [
                'title' => 'New Test Event',
                'description' => 'Detailed description for testing purposes.',
                'venue' => 'Test Arena',
                'address' => '123 Test Street',
                'start_time' => now()->addDays(2)->format('Y-m-d H:i:s'),
                'end_time' => now()->addDays(2)->addHours(4)->format('Y-m-d H:i:s'),
                'timezone' => 'Asia/Manila',
                'max_capacity' => 100,
                'base_price' => 50.00,
                'status' => 'draft',
                'is_featured' => false,
                'is_active' => true,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('events', ['title' => 'New Test Event']);
    }

    public function test_admin_can_create_event_with_rescheduled_status()
    {
        $response = $this->actingAs($this->admin)
            ->postJson('/api/admin/events', [
                'title' => 'Rescheduled Test Event',
                'description' => 'Description',
                'venue' => 'Venue',
                'address' => 'Address',
                'start_time' => now()->addDays(2)->format('Y-m-d H:i:s'),
                'end_time' => now()->addDays(2)->addHours(4)->format('Y-m-d H:i:s'),
                'timezone' => 'Asia/Manila',
                'max_capacity' => 100,
                'base_price' => 50.00,
                'status' => 'rescheduled',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('events', [
            'title' => 'Rescheduled Test Event',
            'status' => 'rescheduled'
        ]);
    }
}
