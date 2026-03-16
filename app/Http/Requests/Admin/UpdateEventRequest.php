<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Update Event Request
 * 
 * This form request handles validation for event updates.
 * It ensures all data is valid and respects business constraints.
 */
class UpdateEventRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 
     * Only admin users can update events.
     * 
     * @return bool
     */
    public function authorize(): bool
    {
        return auth()->user()->isAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     * 
     * These rules ensure data integrity for event updates
     * while allowing partial updates.
     * 
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $event = $this->route('event');
        
        return [
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'venue' => 'required|string|max:255',
            'address' => 'required|string|max:500',
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
            'timezone' => 'required|string|max:50|timezone',
            'max_capacity' => 'required|integer|min:' . ($event->total_tickets_sold ?? 1) . '|max:100000',
            'base_price' => 'required|numeric|min:0|max:99999.99',
            'is_featured' => 'boolean',
            'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'categories' => 'nullable|array',
            'categories.*' => 'integer|exists:event_categories,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     * 
     * These messages provide user-friendly error descriptions
     * for validation failures.
     * 
     * @return array<string, string>
     */
    public function messages(): array
    {
        $event = $this->route('event');
        $ticketsSold = $event->total_tickets_sold ?? 0;
        
        return [
            'title.required' => 'Event title is required.',
            'title.max' => 'Event title must not exceed 255 characters.',
            'description.required' => 'Event description is required.',
            'description.max' => 'Event description must not exceed 5000 characters.',
            'venue.required' => 'Event venue is required.',
            'address.required' => 'Event address is required.',
            'start_time.required' => 'Start time is required.',
            'start_time.after' => 'Start time must be in the future.',
            'end_time.required' => 'End time is required.',
            'end_time.after' => 'End time must be after start time.',
            'timezone.required' => 'Timezone is required.',
            'timezone.timezone' => 'Please select a valid timezone.',
            'max_capacity.required' => 'Maximum capacity is required.',
            'max_capacity.min' => "Maximum capacity cannot be less than {$ticketsSold} (tickets already sold).",
            'max_capacity.max' => 'Maximum capacity cannot exceed 100,000.',
            'base_price.required' => 'Base price is required.',
            'base_price.min' => 'Base price cannot be negative.',
            'base_price.max' => 'Base price cannot exceed $99,999.99.',
            'image.image' => 'Please upload a valid image file.',
            'image.mimes' => 'Image must be a JPEG, PNG, JPG, or GIF file.',
            'image.max' => 'Image size must not exceed 2MB.',
            'categories.*.exists' => 'Selected category is invalid.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     * 
     * These attributes provide more readable field names
     * in error messages.
     * 
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'start_time' => 'start time',
            'end_time' => 'end time',
            'max_capacity' => 'maximum capacity',
            'base_price' => 'base price',
            'is_featured' => 'featured status',
        ];
    }

    /**
     * Configure the validator instance.
     * 
     * This method adds additional validation logic
     * for event updates considering existing data.
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @return void
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $event = $this->route('event');

            // Validate that end time is at least 30 minutes after start time
            if ($this->start_time && $this->end_time) {
                $startTime = \Carbon\Carbon::parse($this->start_time);
                $endTime = \Carbon\Carbon::parse($this->end_time);
                
                if ($endTime->diffInMinutes($startTime) < 30) {
                    $validator->errors()->add('end_time', 'Event must be at least 30 minutes long.');
                }
            }

            // Validate that event is not more than 2 years in the future
            if ($this->start_time) {
                $startTime = \Carbon\Carbon::parse($this->start_time);
                $maxDate = \Carbon\Carbon::now()->addYears(2);
                
                if ($startTime->greaterThan($maxDate)) {
                    $validator->errors()->add('start_time', 'Event cannot be more than 2 years in the future.');
                }
            }

            // Prevent changing start time if event has bookings and is within 48 hours
            if ($event->bookings()->exists() && $this->start_time) {
                $newStartTime = \Carbon\Carbon::parse($this->start_time);
                $oldStartTime = $event->start_time;
                
                if (!$newStartTime->eq($oldStartTime) && $oldStartTime->diffInHours(now()) <= 48) {
                    $validator->errors()->add('start_time', 
                        'Cannot change start time for events with bookings within 48 hours of the event.');
                }
            }

            // Validate capacity reduction doesn't affect existing bookings
            if ($this->max_capacity && $this->max_capacity < $event->max_capacity) {
                $availableCapacity = $this->max_capacity - $event->total_tickets_sold;
                
                if ($availableCapacity < 0) {
                    $validator->errors()->add('max_capacity', 
                        'Cannot reduce capacity below already sold tickets.');
                }
            }

            // Prevent status changes that would affect existing bookings
            if ($event->bookings()->exists() && $event->isUpcoming()) {
                // Additional validation for events with bookings
                if ($this->start_time && $event->start_time->diffInHours(\Carbon\Carbon::parse($this->start_time)) > 24) {
                    // Allow minor time changes (up to 24 hours)
                } else if ($this->start_time && !$event->start_time->eq(\Carbon\Carbon::parse($this->start_time))) {
                    $validator->errors()->add('start_time', 
                        'Cannot make significant time changes for events with existing bookings.');
                }
            }
        });
    }
}
