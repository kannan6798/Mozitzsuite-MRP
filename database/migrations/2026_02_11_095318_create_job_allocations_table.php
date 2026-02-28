<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_allocations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('job_number')->nullable();
            $table->string('item_code')->nullable();
            $table->decimal('allocated_quantity', 15, 2)->nullable();
            $table->timestamp('allocation_date')->nullable();
            $table->string('status')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_allocations');
    }
};
