<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Rfq extends Model
{
    use HasFactory;

    protected $table = 'rfqs';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'rfq_number',
        'title',
        'status',
        'payment_terms',
        'delivery_location',
        'notes',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            $model->id = (string) Str::uuid();
        });
    }
}
