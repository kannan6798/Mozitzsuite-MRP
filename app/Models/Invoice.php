<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Invoice extends Model
{
    use HasUuids;

    protected $fillable = [
        'invoice_number',
        'invoice_date',
        'due_date',
        'customer_id',
        'customer_name',
        'customer_gstin',
        'customer_address',
        'customer_phone',
        'company_name',
        'company_gstin',
        'company_address',
        'company_phone',
        'contact_phone',
        'contact_email',
        'company_pan',
        'terms',
        'signatory',
        'reference_number',
        'subtotal',
        'tax_amount',
        'total_amount',
        'amount_paid',
        'status',
        'notes',

        'account_name',
    'bank_name',
    'account_number',
    'ifsc_code',
    'branch_name',
    'account_type',
     'use_digital_signature',

      // Tax / GST Fields
        'tax_type',
        'place_of_supply',
        'gst_type',
        'cess_percentage',

        // Recurring / Frequency
        'frequency',
        'start_date',
        'end_after',
        'end_date',

        // Reminder Fields
        'before_due_days',
        'overdue_reminder_days',
        
    ];

       protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'cess_percentage' => 'decimal:2',
        'end_after' => 'integer',
        'before_due_days' => 'integer',
        'overdue_reminder_days' => 'integer',
        'use_digital_signature' => 'boolean',
    ];

    // Relationships
    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    // Auto Status Update
    public function updateStatus()
    {
        $amountDue = $this->total_amount - $this->amount_paid;

        if ($amountDue <= 0) {
            $this->status = 'Paid';
        } elseif (now()->gt($this->due_date)) {
            $this->status = 'Overdue';
        } elseif ($this->amount_paid > 0) {
            $this->status = 'Pending';
        } else {
            $this->status = 'Sent';
        }

        $this->save();
    }
    
}
