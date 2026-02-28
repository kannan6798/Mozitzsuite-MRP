<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bom_headers', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('item_type');
            $table->string('item_code');
            $table->string('item_name');
            $table->string('vendor')->nullable();
            $table->string('alternate')->nullable();
            $table->string('revision')->nullable();
            $table->string('uom')->nullable();
            $table->boolean('implemented_only')->default(false);
            $table->string('status')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
            $table->string('created_by')->nullable();
            $table->text('revision_reason')->nullable();
            $table->string('parent_bom_id')->nullable();
            $table->integer('revision_number')->nullable();

             $table->string('document')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bom_headers');
    }
};
