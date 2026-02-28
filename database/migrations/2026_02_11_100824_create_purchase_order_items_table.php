<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('po_id');
            $table->string('item_code');
            $table->text('description')->nullable();
            $table->integer('quantity');
            $table->integer('received_quantity')->default(0);
            $table->decimal('unit_price', 18, 2);
            $table->decimal('total', 18, 2);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_order_items');
    }
};
