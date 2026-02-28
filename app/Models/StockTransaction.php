<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockTransaction extends Model
{
    protected $table = 'stock_transactions';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'item_code',
        'transaction_type',
        'reference_type',
        'reference_number',
        'quantity',
        'unit_cost',
        'transaction_date',
        'notes',
    ];

    protected $casts = [
        'quantity'         => 'decimal:6',
        'unit_cost'        => 'decimal:6',
        'transaction_date' => 'datetime',
    ];
}

