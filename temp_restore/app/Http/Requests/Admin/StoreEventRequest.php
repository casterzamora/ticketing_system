<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Store Event Request
 * 
 * This form request handles validation for event creation.
 * It ensures all required data is present and valid according to business rules.
 */
class StoreEventRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 
     * Only admin users can create events.
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
     * These rules ensure data integrity and business rule compliance
     * for event creation.
     * 
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'venue' => 'required|string|max:255',
            'address' => 'required|string|max:500',
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
            'timezone' => 'required|string|max:50|timezone',
            'max_capacity' => 'required|integer|min:1|max:100000',
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
            'max_capacity.min' => 'Maximum capacity must be at least 1.',
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
     * that cannot be expressed in simple rules.
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @return void
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
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

            // Validate base price against ticket types if provided
            if ($this->base_price && $this->has('ticket_types')) {
                foreach ($this->ticket_types as $index => $ticketType) {
                    if (isset($ticketType['price']) && $ticketType['price'] < $this->base_price * 0.5) {
                        $validator->errors()->add("ticket_types.{$index}.price", 
                            'Ticket price cannot be less than 50% of base price.');
                    }
                }
            }
        });
    }
}
