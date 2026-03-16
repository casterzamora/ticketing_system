<?php

namespace Tests\Feature\Api;

use App\Models\User;
use App\Models\Event;
use App\Models\TicketType;
use App\Models\Booking;
use Tests\TestCase;

class BookingApiTest extends TestCase
{
    public function test_user_can_view_their_bookings(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create();
        $booking = Booking::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);

        $response = $this->actingAs($user)->getJson('/api/user/bookings');

        $response->assertStatus(200);
        $response->assertJsonCount(1);
    }

    public function test_user_can_view_booking_detail(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create();
        $booking = Booking::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);

        $response = $this->actingAs($user)->getJson("/api/user/bookings/{$booking->id}");

        $response->assertStatus(200);
        $response->assertJsonFragment(['booking_reference' => $booking->booking_reference]);
    }

    public function test_user_cannot_view_other_user_booking(): void
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();
        $event = Event::factory()->create();
        $booking = Booking::factory()->create([
            'user_id' => $user1->id,
            'event_id' => $event->id,
        ]);

        $response = $this->actingAs($user2)->getJson("/api/user/bookings/{$booking->id}");

        $response->assertStatus(403);
    }

    public function test_user_can_create_booking(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create(['max_capacity' => 100]);
        $ticketType = TicketType::factory()->create(['event_id' => $event->id]);

        $response = $this->actingAs($user)->postJson('/api/user/bookings', [
            'event_id' => $event->id,
            'customer_name' => 'John Doe',
            'customer_email' => 'john@example.com',
            'customer_phone' => '1234567890',
            'tickets' => [
                $ticketType->id => 2,
            ],
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('bookings', [
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);
    }

    public function test_user_cannot_book_same_event_twice(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->create(['max_capacity' => 100]);
        $ticketType = TicketType::factory()->create(['event_id' => $event->id]);

        Booking::factory()->create([
            'user_id' => $user->id,
            'event_id' => $event->id,
        ]);

        $response = $this->actingAs($user)->postJson('/api/user/bookings', [
            'event_id' => $event->id,
            'customer_name' => 'John Doe',
            'customer_email' => 'john@example.com',
            'customer_phone' => '1234567890',
            'tickets' => [
                $ticketType->id => 1,
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Booking already exists.']);
    }
}
