<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderPackage extends Model
{
    protected $table = 'order_packages';

    protected $fillable = [
        'order_number',
        'customer_name',
        'package_slip',
        'date',
        'status',
        'carrier',
        'tracking_number',
        'internal_notes',
        'items',
    ];

    protected $casts = [
        'items' => 'array', // Automatically cast JSON <-> array
    ];
}