<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Reject Refund Request
 * 
 * This form request handles validation for refund request rejection.
 * It ensures proper authorization and provides reason validation.
 */
class RejectRefundRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 
     * Only admin users can reject refund requests.
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
     * These rules ensure rejection data is valid and includes required reason.
     * 
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'rejection_reason' => 'required|string|min:10|max:1000',
            'admin_notes' => 'nullable|string|max:1000',
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
            'rejection_reason.required' => 'Rejection reason is required.',
            'rejection_reason.min' => 'Rejection reason must be at least 10 characters.',
            'rejection_reason.max' => 'Rejection reason must not exceed 1000 characters.',
            'admin_notes.max' => 'Admin notes must not exceed 1000 characters.',
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
            'rejection_reason' => 'rejection reason',
            'admin_notes' => 'admin notes',
        ];
    }

    /**
     * Configure the validator instance.
     * 
     * This method adds additional validation logic
     * for refund rejection.
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @return void
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $refundRequest = $this->route('refundRequest');

            // Check if refund request exists and is still pending
            if (!$refundRequest || !$refundRequest->isPending()) {
                $validator->errors()->add('status', 
                    'Only pending refund requests can be rejected.');
            }

            // Validate rejection reason content
            if ($this->rejection_reason) {
                // Check for common rejection reasons that should be more specific
                $genericReasons = ['other', 'miscellaneous', 'general', 'various'];
                
                if (in_array(strtolower($this->rejection_reason), $genericReasons)) {
                    $validator->errors()->add('rejection_reason', 
                        'Please provide a more specific rejection reason.');
                }
            }

            // Prevent rejecting refund requests for cancelled events
            if ($refundRequest && $refundRequest->booking->event->status === 'cancelled') {
                $validator->errors()->add('status', 
                    'Cannot reject refund requests for cancelled events.');
            }
        });
    }
}
