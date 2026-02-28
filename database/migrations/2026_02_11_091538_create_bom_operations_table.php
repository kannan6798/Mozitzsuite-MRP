<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bom_operations', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('bom_id');
            $table->integer('operation_seq');
            $table->string('operation_code')->nullable();
            $table->string('description')->nullable();
            $table->string('department')->nullable();
            $table->string('work_center')->nullable();
            $table->boolean('routing_enabled')->default(true);
            $table->decimal('labor_cost', 12, 2)->default(0);
            $table->decimal('machine_cost', 12, 2)->default(0);
            $table->decimal('overhead_cost', 12, 2)->default(0);
            $table->decimal('setup_time', 12, 2)->default(0);
            $table->decimal('run_time', 12, 2)->default(0);
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bom_operations');
    }
};
