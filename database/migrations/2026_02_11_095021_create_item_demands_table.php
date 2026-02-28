<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('item_demands', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('demand_number')->nullable();
            $table->string('item_code')->nullable();
            $table->string('item_name')->nullable();
            $table->text('description')->nullable();
            $table->decimal('quantity', 15, 2)->nullable();
            $table->timestamp('required_date')->nullable();
            $table->string('department')->nullable();
            $table->string('status')->nullable();
            $table->text('notes')->nullable();
            $table->string('created_by')->nullable();
            $table->string('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_demands');
    }
};
