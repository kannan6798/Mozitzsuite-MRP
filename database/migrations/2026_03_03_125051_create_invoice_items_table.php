<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('invoice_id');

            // Item details
            $table->string('item')->nullable();
            $table->string('hsn')->nullable();
            $table->string('material')->nullable();
            $table->text('description')->nullable();

            // Pricing
            $table->decimal('quantity', 15, 2)->default(0);
            $table->decimal('rate', 15, 2)->default(0);

            // Taxes
            $table->decimal('sgst_percent', 8, 2)->default(9);
            $table->decimal('sgst_amount', 15, 2)->default(0);
            $table->decimal('cgst_percent', 8, 2)->default(9);
            $table->decimal('cgst_amount', 15, 2)->default(0);

             $table->decimal('igst_percent', 8, 2)->default(0);
            $table->decimal('igst_amount', 15, 2)->default(0);

            $table->decimal('vat_percent', 8, 2)->default(0);
            $table->decimal('vat_amount', 15, 2)->default(0);

            $table->decimal('sales_tax_percent', 8, 2)->default(0);
            $table->decimal('sales_tax_amount', 15, 2)->default(0);

            $table->decimal('tds_amount', 15, 2)->default(0); 
            $table->decimal('total', 15, 2)->default(0);

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
        Schema::dropIfExists('invoice_items');
    }
};
