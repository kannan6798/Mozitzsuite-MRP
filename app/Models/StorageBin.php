<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StorageBin extends Model
{
    protected $table = 'storage_bins';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'location_id',
        'bin_name',
    ];

    public function location()
    {
        return $this->belongsTo(Location::class, 'location_id');
    }
}

