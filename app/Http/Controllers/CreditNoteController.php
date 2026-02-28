<?php

namespace App\Http\Controllers;

use App\Models\CreditNote;
use Illuminate\Http\Request;

class CreditNoteController extends Controller
{
    // Get all credit notes with items
    public function index()
    {
        return CreditNote::with('items')->get();
    }

    // Get single credit note
    public function show($id)
    {
        return CreditNote::with('items')->findOrFail($id);
    }

    // Store new credit note
    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'credit_note_number' => 'required|string',
            'customer_id' => 'nullable|string',
            'customer_name' => 'required|string',
            'invoice_id' => 'nullable|string',
            'invoice_number' => 'nullable|string',
            'credit_date' => 'nullable|date',
            'reason' => 'nullable|string',
            'status' => 'nullable|string',
            'total_amount' => 'numeric',
            'applied_amount' => 'numeric',
            'notes' => 'nullable|string',
            'created_at' => 'nullable|date',
            'updated_at' => 'nullable|date',
        ]);

        return CreditNote::create($data);
    }

    // Delete credit note
    public function destroy($id)
    {
        $creditNote = CreditNote::findOrFail($id);
        $creditNote->delete();

        return response()->json(['message' => 'Credit note deleted successfully']);
    }
}
