<?php

namespace App\Http\Controllers;

use App\Models\CreditNoteItem;
use Illuminate\Http\Request;

class CreditNoteItemController extends Controller
{
    public function index()
    {
        return CreditNoteItem::all();
    }

    public function show($id)
    {
        return CreditNoteItem::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'credit_note_id' => 'required|string',
            'item_code' => 'required|string',
            'item_name' => 'required|string',
            'quantity' => 'required|integer',
            'unit_price' => 'required|numeric',
            'total' => 'required|numeric',
            'created_at' => 'nullable|date',
        ]);

        return CreditNoteItem::create($data);
    }
}
