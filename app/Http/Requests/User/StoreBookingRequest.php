<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Store Booking Request
 * 
 * This form request handles validation for booking creation.
 * It ensures ticket availability, pricing, and customer data validity.
 */
class StoreBookingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 
     * Authenticated users can create bookings.
     * 
     * @return bool
     */
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * Get the validation rules that apply to the request.
     * 
     * These rules ensure booking data integrity and business rule compliance.
     * 
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $event = $this->route('event');
        $ticketTypeIds = $event?->ticketTypes()->pluck('id')->toArray() ?? [];
        
        return [
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'required|email|max:255',
            'customer_phone' => 'nullable|string|max:20',
            'special_requirements' => 'nullable|string|max:1000',
            'tickets' => 'required|array|min:1',
            'tickets.*' => [
                'required',
                'integer',
                'min:1',
                'max:10',
                function ($attribute, $value, $fail) use ($ticketTypeIds) {
                    $ticketTypeId = explode('.', $attribute)[1];
                    
                    if (!in_array($ticketTypeId, $ticketTypeIds)) {
                        $fail('Invalid ticket type selected.');
                    }
                },
            ],
        ];
    }

    /**
     * Get custom messages for validator errors.
     * 
     * These messages provide user-friendly error descriptions.
     * 
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'customer_name.required' => 'Customer name is required.',
            'customer_name.max' => 'Customer name must not exceed 255 characters.',
            'customer_email.required' => 'Customer email is required.',
            'customer_email.email' => 'Please provide a valid email address.',
            'customer_email.max' => 'Customer email must not exceed 255 characters.',
            'customer_phone.max' => 'Customer phone must not exceed 20 characters.',
            'special_requirements.max' => 'Special requirements must not exceed 1000 characters.',
            'tickets.required' => 'Please select at least one ticket.',
            'tickets.array' => 'Invalid ticket selection format.',
            'tickets.min' => 'Please select at least one ticket.',
            'tickets.*.required' => 'Ticket quantity is required.',
            'tickets.*.integer' => 'Ticket quantity must be a whole number.',
            'tickets.*.min' => 'Ticket quantity must be at least 1.',
            'tickets.*.max' => 'Maximum 10 tickets of each type can be purchased.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     * 
     * These attributes provide more readable field names.
     * 
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'customer_name' => 'customer name',
            'customer_email' => 'customer email',
            'customer_phone' => 'customer phone',
            'special_requirements' => 'special requirements',
            'tickets' => 'tickets',
        ];
    }

    /**
     * Configure the validator instance.
     * 
     * This method adds additional validation logic
     * for booking creation.
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @return void
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $event = $this->route('event');
            $tickets = $this->tickets;

            // Check if event is bookable
            if ($event && !$event->isBookable()) {
                $validator->errors()->add('event', 
                    'This event is not available for booking.');
                return;
            }

            // Check if user already has a booking for this event
            if (auth()->check() && $event) {
                $existingBooking = \App\Models\Booking::where('user_id', auth()->id())
                    ->where('event_id', $event->id)
                    ->first();

                if ($existingBooking) {
                    $validator->errors()->add('event', 
                        'You already have a booking for this event.');
                    return;
                }
            }

            // Validate ticket availability and calculate totals
            $totalTickets = 0;
            $totalAmount = 0;

            if ($tickets && $event) {
                foreach ($tickets as $ticketTypeId => $quantity) {
                    if ($quantity > 0) {
                        $ticketType = $event->ticketTypes()->find($ticketTypeId);
                        
                        if (!$ticketType) {
                            $validator->errors()->add("tickets.{$ticketTypeId}", 
                                'Invalid ticket type selected.');
                            continue;
                        }

                        // Check if ticket type is available
                        if (!$ticketType->isAvailable()) {
                            $validator->errors()->add("tickets.{$ticketTypeId}", 
                                "This ticket type is not available for purchase.");
                            continue;
                        }

                        // Check availability
                        if ($ticketType->available_quantity < $quantity) {
                            $available = $ticketType->available_quantity;
                            $validator->errors()->add("tickets.{$ticketTypeId}", 
                                "Only {$available} tickets available for {$ticketType->name}.");
                            continue;
                        }

                        // Check maximum tickets per booking
                        if ($quantity > 10) {
                            $validator->errors()->add("tickets.{$ticketTypeId}", 
                                'Maximum 10 tickets of each type can be purchased.');
                            continue;
                        }

                        $totalTickets += $quantity;
                        $totalAmount += $ticketType->price * $quantity;
                    }
                }
            }

            // Validate total tickets per booking
            if ($totalTickets > 20) {
                $validator->errors()->add('tickets', 
                    'Maximum 20 tickets can be purchased per booking.');
            }

            // Validate minimum booking amount
            if ($totalAmount > 0 && $totalAmount < 1) {
                $validator->errors()->add('tickets', 
                    'Minimum booking amount is $1.00.');
            }

            // Validate maximum booking amount
            if ($totalAmount > 10000) {
                $validator->errors()->add('tickets', 
                    'Maximum booking amount is $10,000.00.');
            }

            // Validate customer email format and domain
            if ($this->customer_email) {
                $email = $this->customer_email;
                
                // Check for disposable email domains
                $disposableDomains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'];
                $domain = explode('@', $email)[1] ?? '';
                
                if (in_array($domain, $disposableDomains)) {
                    $validator->errors()->add('customer_email', 
                        'Please use a permanent email address.');
                }
            }

            // Validate phone number format if provided
            if ($this->customer_phone) {
                $phone = $this->customer_phone;
                
                // Remove common phone number formatting
                $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
                
                // Check if phone number has reasonable length
                if (strlen($cleanPhone) < 10 || strlen($cleanPhone) > 15) {
                    $validator->errors()->add('customer_phone', 
                        'Please provide a valid phone number.');
                }
            }
        });
    }
}
