<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemDemand extends Model
{
    protected $table = 'item_demands';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $keyType = 'string';
    public $timestamps = false;

    protected $fillable = [
        'id',
        'demand_number',
        'item_code',
        'item_name',
        'description',
        'quantity',
        'required_date',
        'department',
        'status',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
        'created_at',
        'updated_at',
    ];
}
