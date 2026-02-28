<?php

namespace App\Http\Controllers;

use App\Models\GRNItem;
use Illuminate\Http\Request;

class GRNItemController extends Controller
{
    public function index($grn_id)
    {
        return GRNItem::where('grn_id', $grn_id)->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'grn_id' => 'required|string|exists:grns,id',
            'item_code' => 'required|string',
            'description' => 'nullable|string',
            'po_quantity' => 'nullable|numeric',
            'received_quantity' => 'nullable|numeric',
            'accepted_quantity' => 'nullable|numeric',
            'rejected_quantity' => 'nullable|numeric',
            'balance_quantity' => 'nullable|numeric',
            'unit_price' => 'nullable|numeric',
            'total_amount' => 'nullable|numeric',
            'rejection_reason' => 'nullable|string',
            'created_at' => 'nullable|date',
        ]);

        return GRNItem::create($data);
    }

    public function destroy($id)
    {
        GRNItem::findOrFail($id)->delete();

        return response()->json(['message' => 'Item deleted']);
    }
}
