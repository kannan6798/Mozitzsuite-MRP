<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Category extends Model
{
    protected $table = 'categories';
    protected $primaryKey = 'id';
    public $incrementing = false; // We'll use UUIDs
    public $timestamps = false;

    protected $fillable = [
        'id',
        'name',
        'created_at'
    ];

    // Automatically generate UUID if id is not provided
    protected static function booted()
    {
        static::creating(function ($category) {
            if (!$category->id) {
                $category->id = (string) Str::uuid();
            }
            if (!$category->created_at) {
                $category->created_at = now();
            }
        });
    }
}