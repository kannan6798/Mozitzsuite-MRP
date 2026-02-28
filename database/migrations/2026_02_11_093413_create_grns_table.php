<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('grns', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('grn_number')->unique();
            $table->string('po_number');
            $table->string('vendor');
            $table->date('receipt_date')->nullable();
            $table->string('qc_status')->default('Pending'); // Pending, Accepted, Rejected, Partially Accepted
            $table->text('notes')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('grns');
    }
};
