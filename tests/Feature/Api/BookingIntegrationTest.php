<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\Event;
use App\Models\TicketType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingIntegrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Integration test: Full booking flow from event creation to booking confirmation
     */
    public function test_complete_booking_flow()
    {
        // 1. Create an admin user (already created by setUp through roles seeder)
        $admin = User::factory()->create(['email' => 'admin@test.com']);
        $admin->assignRole('admin');

        // 2. Create a regular user
        $customer = User::factory()->create(['email' => 'customer@test.com']);
        $customer->assignRole('user');

        // 3. Admin creates an event
        $eventData = [
            'title' => 'Integration Test Event',
            'description' => 'Test event for integration testing',
            'venue' => 'Test Venue',
            'address' => '123 Test St',
            'start_time' => now()->addDays(30)->toIso8601String(),
            'end_time' => now()->addDays(30)->addHours(3)->toIso8601String(),
            'timezone' => 'UTC',
            'max_capacity' => 100,
            'base_price' => 100,
            'status' => 'published',
            'is_active' => true,
            'is_featured' => false,
        ];

        $response = $this->actingAs($admin)->postJson('/api/admin/events', $eventData);
        $response->assertStatus(201);
        $event = $response->json('data');
        $this->assertNotNull($event['id']);

        // 4. Admin adds ticket types
        $ticketData = [
            'name' => 'Regular Ticket',
            'description' => 'Regular admission ticket',
            'price' => 150,
            'quantity_available' => 50,
            'is_active' => true,
        ];

        $response = $this->actingAs($admin)->postJson("/api/admin/events/{$event['id']}/ticket-types", $ticketData);
        $response->assertStatus(201);
        $ticketType = $response->json('data');
        $this->assertNotNull($ticketType['id']);
        $this->assertEquals(50, $ticketType['remaining']);

        // 5. Fetch event to verify ticket types are available
        $response = $this->getJson("/api/events/{$event['id']}");
        $response->assertStatus(200);
        $eventData = $response->json('data');
        $this->assertCount(1, $eventData['ticket_types']);
        $this->assertEquals(50, $eventData['ticket_types'][0]['remaining']);

        // 6. Customer creates a booking
        $bookingData = [
            'event_id' => $event['id'],
            'customer_name' => 'Test Customer',
            'customer_email' => 'customer@test.com',
            'customer_phone' => '1234567890',
            'special_requirements' => 'None',
            'tickets' => [
                $ticketType['id'] => 2, // Buy 2 tickets
            ],
        ];

        $response = $this->actingAs($customer)->postJson('/api/user/bookings', $bookingData);
        $response->assertStatus(201);
        $booking = $response->json('data');
        $this->assertNotNull($booking['id']);
        $this->assertEquals(300, $booking['total_amount']); // 2 * 150
        $this->assertEquals('pending', $booking['status']);

        // 7. Verify ticket type quantities were updated
        $response = $this->getJson("/api/events/{$event['id']}");
        $eventData = $response->json('data');
        $this->assertEquals(48, $eventData['ticket_types'][0]['remaining']); // 50 - 2

        // 8. Customer can view their booking
        $response = $this->actingAs($customer)->getJson('/api/user/bookings');
        $response->assertStatus(200);
        $bookings = $response->json('data');
        $this->assertCount(1, $bookings);
        $this->assertEquals($booking['id'], $bookings[0]['id']);
    }
}
