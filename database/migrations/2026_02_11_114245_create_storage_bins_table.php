<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateStorageBinsTable extends Migration
{
    public function up()
    {
        Schema::create('storage_bins', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('location_id');
            $table->string('bin_name')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('storage_bins');
    }
}
