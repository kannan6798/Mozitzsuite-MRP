<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('invoice_number');
            $table->date('invoice_date');
            $table->date('due_date');

            // Customer Info
            $table->string('customer_id')->nullable();
            $table->string('customer_name');
            $table->string('customer_gstin')->nullable();
            $table->text('customer_address')->nullable();
            $table->string('customer_phone')->nullable();

            $table->string('reference_number')->nullable();

            $table->string('company_name')->nullable();
            $table->string('company_gstin')->nullable();
             $table->string('company_pan')->nullable();
            $table->text('company_address')->nullable();
            $table->string('company_phone')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();

             // Bank Details
            $table->string('account_name')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('ifsc_code')->nullable();
            $table->string('account_type')->nullable(); // Savings / Current
            $table->string('branch_name')->nullable();

            $table->text('terms')->nullable();
            $table->string('signatory')->nullable();
            $table->boolean('use_digital_signature')->default(false);
            // Amounts
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
             
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('amount_paid', 15, 2)->default(0);

            $table->string('status')->default('Draft'); // Draft, Sent, Paid, Pending, Overdue
            $table->text('notes')->nullable();

              // New Fields for Tax & GST
            $table->string('tax_type')->nullable(); // e.g., GST, VAT
            $table->string('place_of_supply')->nullable();
            $table->string('gst_type')->nullable(); // e.g., CGST+SGST, IGST
            $table->decimal('cess_percentage', 5, 2)->nullable(); // e.g., 1.5%
            
            // Recurring / Frequency Fields
            $table->string('frequency')->nullable(); // e.g., Monthly, Quarterly
            $table->date('start_date')->nullable();
            $table->integer('end_after')->nullable(); // number of occurrences
            $table->date('end_date')->nullable();

            // Reminder Fields
            $table->integer('before_due_days')->nullable(); // reminder days before due
            $table->integer('overdue_reminder_days')->nullable(); // reminder days after overdue


            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
