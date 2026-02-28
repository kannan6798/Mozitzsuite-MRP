<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
    {
        Schema::create('rfqs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('rfq_number')->unique();
            $table->string('title');
            $table->string('status')->default('Draft');
            $table->string('payment_terms')->nullable();
            $table->string('delivery_location')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('rfqs');
    }
};
