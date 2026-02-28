<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GRN extends Model
{
    protected $table = 'grns';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'grn_number',
        'po_number',
        'vendor',
        'receipt_date',
        'qc_status',
        'notes',
        'created_by',
        'created_at',
        'updated_at'
    ];

    public function items()
{
    return $this->hasMany(GRNItem::class, 'grn_id');
}

}
