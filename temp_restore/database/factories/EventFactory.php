<?php

namespace Database\Factories;

use App\Models\Event;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class EventFactory extends Factory
{
    protected $model = Event::class;

    public function definition(): array
    {
        return [
            'created_by' => User::factory(),
            'title' => $this->faker->sentence(3),
            'description' => $this->faker->paragraph(),
            'venue' => $this->faker->streetAddress(),
            'address' => $this->faker->address(),
            'start_time' => $this->faker->dateTimeBetween('+1 day', '+30 days'),
            'end_time' => $this->faker->dateTimeBetween('+31 days', '+60 days'),
            'timezone' => 'Asia/Manila',
            'max_capacity' => $this->faker->numberBetween(100, 1000),
            'base_price' => $this->faker->numberBetween(500, 5000),
            'status' => 'published',
            'is_featured' => false,
            'is_active' => true,
        ];
    }
}
