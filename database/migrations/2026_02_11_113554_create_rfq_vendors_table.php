<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateRfqVendorsTable extends Migration
{
    public function up()
    {
        Schema::create('rfq_vendors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('rfq_id')->nullable();
            $table->string('vendor_name')->nullable();
            $table->string('vendor_email')->nullable();
            $table->string('vendor_contact')->nullable();
            $table->string('status')->nullable();
            $table->timestampTz('sent_at')->nullable();
            $table->timestampTz('responded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('rfq_vendors');
    }
}
