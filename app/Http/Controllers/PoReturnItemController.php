<?php

namespace App\Http\Controllers;

use App\Models\PoReturnItem;
use Illuminate\Http\Request;

class PoReturnItemController extends Controller
{
    public function index()
    {
        return PoReturnItem::all();
    }

    public function show($id)
    {
        return PoReturnItem::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'return_id' => 'required|string',
            'grn_item_id' => 'nullable|string',
            'item_code' => 'required|string',
            'description' => 'nullable|string',
            'return_quantity' => 'required|integer',
            'max_returnable_quantity' => 'required|integer',
            'unit_price' => 'required|numeric',
            'tax_percent' => 'nullable|numeric',
            'tax_amount' => 'nullable|numeric',
            'total_amount' => 'required|numeric',
            'created_at' => 'nullable|date',
        ]);

        return PoReturnItem::create($data);
    }

    public function update(Request $request, $id)
    {
        $item = PoReturnItem::findOrFail($id);

        $data = $request->validate([
            'return_id' => 'sometimes|required|string',
            'grn_item_id' => 'nullable|string',
            'item_code' => 'sometimes|required|string',
            'description' => 'nullable|string',
            'return_quantity' => 'sometimes|required|integer',
            'max_returnable_quantity' => 'sometimes|required|integer',
            'unit_price' => 'sometimes|required|numeric',
            'tax_percent' => 'nullable|numeric',
            'tax_amount' => 'nullable|numeric',
            'total_amount' => 'sometimes|required|numeric',
        ]);

        $item->update($data);

        return $item;
    }

    public function destroy($id)
    {
        $item = PoReturnItem::findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}
