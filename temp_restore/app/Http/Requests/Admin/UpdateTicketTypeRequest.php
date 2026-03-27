<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Update Ticket Type Request
 * 
 * This form request handles validation for ticket type updates.
 * It ensures updates don't violate business rules or affect existing sales.
 */
class UpdateTicketTypeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 
     * Only admin users can update ticket types.
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
     * These rules ensure ticket type data integrity during updates.
     * 
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $ticketType = $this->route('ticket_type');
        
        return [
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:1000',
            'price' => 'required|numeric|min:0|max:99999.99',
            'quantity_available' => 'required|integer|min:' . ($ticketType->quantity_sold ?? 1) . '|max:10000',
            'is_active' => 'boolean',
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
        $ticketType = $this->route('ticket_type');
        $quantitySold = $ticketType->quantity_sold ?? 0;
        
        return [
            'name.required' => 'Ticket type name is required.',
            'name.max' => 'Ticket type name must not exceed 100 characters.',
            'description.max' => 'Description must not exceed 1000 characters.',
            'price.required' => 'Ticket price is required.',
            'price.min' => 'Ticket price cannot be negative.',
            'price.max' => 'Ticket price cannot exceed $99,999.99.',
            'quantity_available.required' => 'Available quantity is required.',
            'quantity_available.min' => "Available quantity cannot be less than {$quantitySold} (tickets already sold).",
            'quantity_available.max' => 'Available quantity cannot exceed 10,000.',
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
            'name' => 'ticket type name',
            'price' => 'ticket price',
            'quantity_available' => 'available quantity',
            'is_active' => 'active status',
        ];
    }

    /**
     * Configure the validator instance.
     * 
     * This method adds additional validation logic
     * for ticket type updates considering existing data.
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @return void
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $ticketType = $this->route('ticket_type');
            $event = $ticketType->event;

            // Prevent editing ticket types with existing sales
            if ($ticketType->quantity_sold > 0) {
                $validator->errors()->add('name', 
                    'Cannot edit ticket types with existing sales.');
                return;
            }

            // Validate ticket type name uniqueness within the event (excluding current)
            if ($this->name && $event) {
                $exists = $event->ticketTypes()
                    ->where('name', $this->name)
                    ->where('id', '!=', $ticketType->id)
                    ->exists();

                if ($exists) {
                    $validator->errors()->add('name', 
                        'A ticket type with this name already exists for this event.');
                }
            }

            // Validate price against event base price
            if ($this->price && $event) {
                $basePrice = $event->base_price;
                
                // Ticket price should be within reasonable range of base price
                if ($this->price < $basePrice * 0.1) {
                    $validator->errors()->add('price', 
                        'Ticket price cannot be less than 10% of the event base price.');
                }
                
                if ($this->price > $basePrice * 10) {
                    $validator->errors()->add('price', 
                        'Ticket price cannot be more than 10 times the event base price.');
                }
            }

            // Validate quantity doesn't exceed event capacity
            if ($this->quantity_available && $event) {
                $otherTicketTypes = $event->ticketTypes()
                    ->where('id', '!=', $ticketType->id)
                    ->get();
                $totalOtherQuantity = $otherTicketTypes->sum('quantity_available');
                
                if ($this->quantity_available + $totalOtherQuantity > $event->max_capacity) {
                    $validator->errors()->add('quantity_available', 
                        'Total ticket quantities cannot exceed event maximum capacity.');
                }
            }

            // Prevent updating ticket types for cancelled or completed events
            if ($event && in_array($event->status, ['cancelled', 'completed'])) {
                $validator->errors()->add('name', 
                    'Cannot update ticket types for cancelled or completed events.');
            }

            // Prevent deactivating the only active ticket type for a published event
            if ($this->is_active === false && $event->status === 'published') {
                $activeTicketTypes = $event->activeTicketTypes()
                    ->where('id', '!=', $ticketType->id)
                    ->count();

                if ($activeTicketTypes === 0) {
                    $validator->errors()->add('is_active', 
                        'Cannot deactivate the only active ticket type for a published event.');
                }
            }
        });
    }
}
