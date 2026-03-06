<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryStock extends Model
{
    protected $table = 'inventory_stock';
    
    public $timestamps = true;

    protected $fillable = [
        'item_code',
        'item_name',
        'description',
        'item_type',
        'sku',                    // new
        'quantity_on_hand',
        'allocated_quantity',
        'available_quantity',
        'unit_cost',
        'selling_price',          // new
        'hsn_code',               // new
        'tax_rate',               // new
        'location',
        'reorder_point',
        'last_transaction_date',
        'committed_quantity',
        'barcode',
        'item_mode',
        'variant_name',
        'variant_attributes',
        'default_supplier',
        'auto_reorder',
        'grn_required',           // new
        'categories',
        'usability_make',
        'usability_buy',
        'usability_sell',
        'location_tracking',      // new
        'auto_generate_serial',   // new
        'serial_number_format',   // new
        'lead_time_days',
        'safety_stock',
    ];

    protected $casts = [
        'quantity_on_hand' => 'decimal:2',
        'allocated_quantity' => 'decimal:2',
        'available_quantity' => 'decimal:2',
        'committed_quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'selling_price' => 'decimal:2',    // new
        'reorder_point' => 'decimal:2',
        'tax_rate' => 'decimal:2',         // new
        'auto_reorder' => 'boolean',
        'grn_required' => 'boolean',       // new
        'usability_make' => 'boolean',
        'usability_buy' => 'boolean',
        'usability_sell' => 'boolean',
        'location_tracking' => 'boolean',  // new
        'auto_generate_serial' => 'boolean', // new
        'lead_time_days' => 'integer',
        'safety_stock' => 'integer',
    ];

    protected $dates = [
        'last_transaction_date',
        'created_at',
        'updated_at',
    ];
}