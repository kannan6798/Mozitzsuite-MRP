<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_packages', function (Blueprint $table) {
            $table->id();

            $table->string('order_number');
            $table->string('customer_name');

            $table->string('package_slip')->nullable();
            $table->date('date');

            $table->enum('status', ['not_shipped', 'shipped', 'delivered'])
                  ->default('not_shipped');

            $table->string('carrier')->nullable();
            $table->string('tracking_number')->nullable();
            $table->text('internal_notes')->nullable();

            // Store multiple items as JSON
            $table->json('items')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_packages');
    }
};