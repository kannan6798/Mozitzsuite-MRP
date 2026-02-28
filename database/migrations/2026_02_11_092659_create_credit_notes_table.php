<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_notes', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('credit_note_number');
            $table->string('customer_id')->nullable();
            $table->string('customer_name');
            $table->string('invoice_id')->nullable();
            $table->string('invoice_number')->nullable();
            $table->date('credit_date')->nullable();
            $table->text('reason')->nullable();
            $table->string('status')->default('Draft');
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('applied_amount', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_notes');
    }
};
