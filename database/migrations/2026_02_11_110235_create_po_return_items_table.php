<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('po_return_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('return_id');
            $table->uuid('grn_item_id')->nullable();
            $table->string('item_code');
            $table->text('description')->nullable();
            $table->integer('return_quantity');
            $table->integer('max_returnable_quantity');
            $table->decimal('unit_price', 18, 2);
            $table->decimal('tax_percent', 5, 2)->nullable();
            $table->decimal('tax_amount', 18, 2)->nullable();
            $table->decimal('total_amount', 18, 2);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('po_return_items');
    }
};
