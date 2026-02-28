<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('payable_id');
            $table->dateTime('payment_date');
            $table->string('payment_mode');
            $table->string('reference_number')->nullable();
            $table->decimal('paid_amount', 18, 2);
            $table->text('remarks')->nullable();
            $table->uuid('created_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_history');
    }
};
