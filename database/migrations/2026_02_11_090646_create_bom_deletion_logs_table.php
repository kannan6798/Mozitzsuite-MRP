<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bom_deletion_logs', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('bom_id');
            $table->string('item_code');
            $table->string('item_name');
            $table->string('revision');
            $table->string('deleted_by');
            $table->timestamp('deleted_at')->nullable();
            $table->text('reason')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bom_deletion_logs');
    }
};
