<?php

namespace App\Http\Controllers;

use App\Models\CreditNoteItem;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CreditNoteItemController extends Controller
{
    public function index(Request $request)
    {
        $creditNoteId = $request->query('credit_note_id');

        if ($creditNoteId) {
            $items = CreditNoteItem::where('credit_note_id', $creditNoteId)->get();
        } else {
            $items = CreditNoteItem::all();
        }

        return response()->json($items);
    }

    // Get single item
    public function show($id)
    {
        $item = CreditNoteItem::findOrFail($id);
        return response()->json($item);
    }

    public function store(Request $request)
{
    $items = $request->all(); // get array of items

    $createdItems = [];

    foreach ($items as $itemData) {
        $data = validator($itemData, [
            'credit_note_id' => 'required|string|exists:credit_notes,id',
            'item_code' => 'nullable|string',
            'item_name' => 'required|string',
            'quantity' => 'required|integer',
            'unit_price' => 'required|numeric',
            'total' => 'required|numeric',
            'created_at' => 'nullable|date',
        ])->validate();

        if (empty($data['created_at'])) {
            $data['created_at'] = now();
        }

        if (empty($data['id'])) {
            $data['id'] = (string) Str::uuid();
        }

        $createdItems[] = CreditNoteItem::create($data);
    }

    return response()->json($createdItems, 201);
}
}
