<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseOrderItem extends Model
{
    protected $table = 'purchase_order_items';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    public $timestamps = false;

    protected $fillable = [
        'id',
        'po_id',
        'item_code',
        'description',
        'quantity',
        'received_quantity',
        'unit_price',
        'total',
        'created_at',
    ];
}
