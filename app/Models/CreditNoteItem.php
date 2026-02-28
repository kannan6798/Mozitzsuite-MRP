<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CreditNoteItem extends Model
{
    protected $table = 'credit_note_items';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'credit_note_id',
        'item_code',
        'item_name',
        'quantity',
        'unit_price',
        'total',
        'created_at'
    ];
    
}
