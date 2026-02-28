<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('customer_name');
            $table->string('customer_code')->unique()->nullable();
            $table->string('customer_type')->nullable();
            $table->string('contact_person')->nullable();
            $table->string('primary_contact')->nullable();
            $table->string('mobile')->nullable();
            $table->string('email')->nullable();         
            $table->text('billing_address')->nullable();
            $table->text('shipping_address')->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('postal_code')->nullable();
            $table->string('country')->nullable();
            $table->string('currency')->nullable();
            $table->string('gst_number')->nullable();
            $table->string('status')->default('Active');
            $table->string('company_name')->nullable();
            $table->string('pan_number')->nullable();
            $table->string('cin')->nullable();
            $table->string('industry_type')->nullable();
            $table->string('website')->nullable();
             $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
