<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grn_items', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('grn_id');

            $table->string('item_code');
            $table->string('description')->nullable();

            $table->decimal('po_quantity', 15, 2)->default(0);
            $table->decimal('received_quantity', 15, 2)->default(0);
            $table->decimal('accepted_quantity', 15, 2)->default(0);
            $table->decimal('rejected_quantity', 15, 2)->default(0);
            $table->decimal('balance_quantity', 15, 2)->default(0);

            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);

            $table->text('rejection_reason')->nullable();
            $table->timestamp('created_at')->nullable();

            // Foreign key
            $table->foreign('grn_id')
                  ->references('id')
                  ->on('grns')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grn_items');
    }
};
