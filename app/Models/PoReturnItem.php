<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PoReturnItem extends Model
{
    protected $table = 'po_return_items';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $keyType = 'string';

    public $timestamps = false;  // since table has only created_at

    protected $fillable = [
        'id',
        'return_id',
        'grn_item_id',
        'item_code',
        'description',
        'return_quantity',
        'max_returnable_quantity',
        'unit_price',
        'tax_percent',
        'tax_amount',
        'total_amount',
        'created_at',
    ];
}
