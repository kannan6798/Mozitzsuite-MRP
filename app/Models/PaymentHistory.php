<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentHistory extends Model
{
    protected $table = 'payment_history';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $keyType = 'string';

    protected $fillable = [
        'id',
        'payable_id',
        'payment_date',
        'payment_mode',
        'reference_number',
        'paid_amount',
        'remarks',
        'created_by',
    ];
}
