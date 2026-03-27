<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\User;
use App\Models\Event;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingFactory extends Factory
{
    protected $model = Booking::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'event_id' => Event::factory(),
            'booking_reference' => 'BK-' . date('Y') . '-' . strtoupper(substr(uniqid(), -5)),
            'customer_name' => $this->faker->name(),
            'customer_email' => $this->faker->unique()->email(),
            'customer_phone' => $this->faker->phoneNumber(),
            'special_requirements' => $this->faker->sentence(),
            'total_tickets' => $this->faker->numberBetween(1, 5),
            'total_amount' => $this->faker->numberBetween(1000, 50000),
            'status' => 'confirmed',
        ];
    }
}
