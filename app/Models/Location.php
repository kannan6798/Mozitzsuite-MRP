<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    protected $table = 'locations';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $keyType = 'string';

    protected $fillable = [
        'id',
        'location_name',
        'legal_name',
        'address',
        'sell_enabled',
        'make_enabled',
        'buy_enabled',
    ];
}
