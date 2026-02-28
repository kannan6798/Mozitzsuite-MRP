<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bom_components', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('bom_id');
            $table->integer('item_seq');
            $table->integer('operation_seq');
            $table->string('component');
            $table->string('description');
            $table->integer('quantity');
            $table->string('uom');
            $table->string('basis');
            $table->string('type');
            $table->string('status');
            $table->integer('planning_percent');
            $table->integer('yield_percent');
            $table->boolean('include_in_cost_rollup');
            $table->decimal('unit_cost', 12, 2);
            $table->decimal('total_cost', 12, 2);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bom_components');
    }
};
