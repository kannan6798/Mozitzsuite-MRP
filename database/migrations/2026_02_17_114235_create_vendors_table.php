<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vendors', function (Blueprint $table) {
            $table->id();
            $table->string('vendor_id')->nullable();
             $table->string('vendor_name');
            $table->string('company')->nullable();
            $table->string('contact_person')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('total_orders')->nullable();
            $table->string('country')->nullable();
            $table->string('currency')->nullable();
            $table->string('rating')->nullable();
            $table->string('status')->default('Active');

            // New Columns
            $table->string('business_registration')->nullable();
            $table->string('business_number')->nullable();
            $table->text('incorporation_details')->nullable();
            $table->string('gst_number')->nullable();
            $table->text('other_tax_details')->nullable();
            $table->text('billing_address')->nullable();
            $table->text('shipping_address')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('ifsc_code')->nullable();
            $table->string('branch')->nullable();

            $table->string('vendor_type')->nullable();
            $table->text('notes')->nullable();
            $table->text('tags')->nullable();
            $table->json('attachments')->nullable();
            $table->string('gst_certificate')->nullable();
            $table->string('pan_copy')->nullable();
            $table->string('agreement')->nullable();
            $table->json('kyc_documents')->nullable();

            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vendors');
    }
};
