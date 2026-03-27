<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Approve Refund Request
 * 
 * This form request handles validation for refund request approval.
 * It ensures proper authorization and business rule compliance.
 */
class ApproveRefundRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * 
     * Only admin users can approve refund requests.
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
     * These rules ensure refund approval data is valid.
     * 
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'refund_method' => 'required|in:original,credit,bank_transfer',
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
            'refund_method.required' => 'Refund method is required.',
            'refund_method.in' => 'Please select a valid refund method.',
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
            'refund_method' => 'refund method',
            'admin_notes' => 'admin notes',
        ];
    }

    /**
     * Configure the validator instance.
     * 
     * This method adds additional validation logic
     * for refund approval.
     * 
     * @param \Illuminate\Validation\Validator $validator
     * @return void
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $refundRequest = $this->route('refundRequest');

            // Check if refund request exists and can be approved
            if (!$refundRequest || !$refundRequest->canBeApproved()) {
                $validator->errors()->add('status', 
                    'This refund request cannot be approved based on current business rules.');
            }

            // Validate refund method based on original payment
            if ($this->refund_method && $refundRequest) {
                $originalPayment = $refundRequest->booking->successfulPayment();
                
                if ($originalPayment) {
                    $validMethods = ['original'];
                    
                    // Add additional methods based on original payment type
                    if (in_array($originalPayment->payment_method, ['credit_card', 'debit_card'])) {
                        $validMethods[] = 'credit';
                    }
                    
                    if (!in_array($this->refund_method, $validMethods)) {
                        $validator->errors()->add('refund_method', 
                            'Selected refund method is not compatible with original payment method.');
                    }
                }
            }

            // Check if refund amount is reasonable
            if ($refundRequest && $refundRequest->refund_amount > $refundRequest->booking->total_amount) {
                $validator->errors()->add('amount', 
                    'Refund amount cannot exceed booking total amount.');
            }
        });
    }
}
