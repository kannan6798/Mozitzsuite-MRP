<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateRfqItemsTable extends Migration
{
    public function up()
    {
        Schema::create('rfq_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('rfq_id')->nullable();
            $table->uuid('demand_id')->nullable();
            $table->string('item_code')->nullable();
            $table->string('item_name')->nullable();
            $table->text('description')->nullable();
            $table->integer('quantity')->default(0);
            $table->date('required_date')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('rfq_items');
    }
}
