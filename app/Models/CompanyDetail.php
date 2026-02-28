<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CompanyDetail extends Model
{
    use HasFactory;

    protected $table = 'company_details';
    public $incrementing = false;
    protected $keyType = 'uuid';

    protected $fillable = [
        'name',
        'email',
        'phone',
        'gstin',
        'pan',
        'address',
        'bank_account_name',
        'bank_account_number',
        'ifsc',
        'account_type',
        'bank_name',
        'branch',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid();
            }
        });
    }
}