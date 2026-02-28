<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrderItem;
use Illuminate\Http\Request;

class PurchaseOrderItemController extends Controller
{
    public function index()
    {
        return PurchaseOrderItem::all();
    }

    public function show($id)
    {
        return PurchaseOrderItem::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'po_id' => 'required|string',
            'item_code' => 'required|string',
            'description' => 'nullable|string',
            'quantity' => 'required|integer',
            'received_quantity' => 'required|integer',
            'unit_price' => 'required|numeric',
            'total' => 'required|numeric',
            'created_at' => 'nullable|date',
        ]);

        return PurchaseOrderItem::create($data);
    }

    public function update(Request $request, $id)
    {
        $item = PurchaseOrderItem::findOrFail($id);

        $data = $request->validate([
            'po_id' => 'sometimes|required|string',
            'item_code' => 'sometimes|required|string',
            'description' => 'nullable|string',
            'quantity' => 'sometimes|required|integer',
            'received_quantity' => 'sometimes|required|integer',
            'unit_price' => 'sometimes|required|numeric',
            'total' => 'sometimes|required|numeric',
        ]);

        $item->update($data);

        return $item;
    }

    public function destroy($id)
    {
        $item = PurchaseOrderItem::findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}
