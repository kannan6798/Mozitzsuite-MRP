<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('invoice_id');

            $table->date('payment_date');
            $table->decimal('amount', 15, 2)->default(0);
            $table->string('method')->nullable(); // cash, bank_transfer, upi, cheque, card
            $table->string('reference')->nullable();

            $table->timestamps();

            // Foreign Key
            $table->foreign('invoice_id')
                  ->references('id')
                  ->on('invoices')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
