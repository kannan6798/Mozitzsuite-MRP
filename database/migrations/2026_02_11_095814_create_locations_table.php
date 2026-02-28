<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('locations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('location_name')->nullable();
            $table->string('legal_name')->nullable();
            $table->text('address')->nullable();
            $table->boolean('sell_enabled')->default(false);
            $table->boolean('make_enabled')->default(false);
            $table->boolean('buy_enabled')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('locations');
    }
};
