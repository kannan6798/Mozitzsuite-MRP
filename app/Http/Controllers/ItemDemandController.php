<?php

namespace App\Http\Controllers;

use App\Models\ItemDemand;
use Illuminate\Http\Request;

class ItemDemandController extends Controller
{
    public function index()
    {
        return ItemDemand::all();
    }

    public function show($id)
    {
        return ItemDemand::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'demand_number' => 'nullable|string',
            'item_code' => 'nullable|string',
            'item_name' => 'nullable|string',
            'description' => 'nullable|string',
            'quantity' => 'nullable|numeric',
            'required_date' => 'nullable|date',
            'department' => 'nullable|string',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
            'created_by' => 'nullable|string',
            'approved_by' => 'nullable|string',
            'approved_at' => 'nullable|date',
            'created_at' => 'nullable|date',
            'updated_at' => 'nullable|date',
        ]);

        return ItemDemand::create($data);
    }
}
