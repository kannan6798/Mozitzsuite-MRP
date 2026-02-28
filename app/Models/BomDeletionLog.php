<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class BomDeletionLog extends Model
{
    protected $table = 'bom_deletion_logs';
    protected $primaryKey = 'id';
    public $incrementing = false;
    public $timestamps = false;

    protected $fillable = [
        'id',
        'bom_id',
        'item_code',
        'item_name',
        'revision',
        'deleted_by',
        'deleted_at',
        'reason',
        'created_at'
    ];
    protected static function booted()
    {
        static::creating(function ($model) {
            if (!$model->id) {
                $model->id = (string) Str::uuid(); // ✅ Auto-generate UUID
            }
            if (!$model->deleted_at) {
                $model->deleted_at = now();
            }
        });
    }
}
