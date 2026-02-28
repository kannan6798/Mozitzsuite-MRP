<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_details', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('gstin')->nullable();
            $table->string('pan')->nullable();
            $table->text('address')->nullable();

            $table->string('bank_account_name')->nullable();
            $table->string('bank_account_number')->nullable();
            $table->string('ifsc')->nullable();
            $table->string('account_type')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('branch')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_details');
    }
};