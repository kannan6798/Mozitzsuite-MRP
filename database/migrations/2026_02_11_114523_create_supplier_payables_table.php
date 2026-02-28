<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateSupplierPayablesTable extends Migration
{
    public function up()
    {
        Schema::create('supplier_payables', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('vendor')->nullable();
            $table->string('reference_type')->nullable();
            $table->string('reference_number')->nullable();
            $table->timestampTz('transaction_date')->nullable();
            $table->decimal('debit', 20, 6)->nullable();
            $table->decimal('credit', 20, 6)->nullable();
            $table->decimal('balance', 20, 6)->nullable();
            $table->string('status')->nullable();
            $table->timestampTz('due_date')->nullable();
            $table->text('notes')->nullable();
            
            // extra fields
            $table->string('grn_number')->nullable();
            $table->string('po_number')->nullable();
            $table->decimal('accepted_quantity', 20, 6)->nullable();
            $table->decimal('unit_price', 20, 6)->nullable();
            $table->decimal('tax_amount', 20, 6)->nullable();
            $table->decimal('total_amount', 20, 6)->nullable();
            $table->decimal('paid_amount', 20, 6)->nullable();
            $table->string('invoice_number')->nullable();
            $table->timestampTz('invoice_date')->nullable();
            $table->string('approved_by')->nullable();
            $table->timestampTz('approved_at')->nullable();
            $table->string('payment_status')->nullable();

            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('supplier_payables');
    }
}
