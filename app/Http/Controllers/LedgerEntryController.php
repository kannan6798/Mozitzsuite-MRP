<?php

namespace App\Http\Controllers;

use App\Models\LedgerEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LedgerEntryController extends Controller
{
    public function index()
    {
        return LedgerEntry::all();
    }

    public function show($id)
    {
        return LedgerEntry::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|string',
            'user_id' => 'nullable|string',
            'category' => 'nullable|string',
            'company_name' => 'nullable|string',
            'document_type' => 'nullable|string',
            'document_date' => 'nullable|date',
            'document_number' => 'nullable|string',
            'debit' => 'nullable|numeric',
            'credit' => 'nullable|numeric',
        ]);

          // Generate ID if not provided
    if (empty($data['id'])) {
        $data['id'] = (string) Str::uuid();
    }

        return LedgerEntry::create($data);
    }

      public function destroy($id)
    {
        $entry = LedgerEntry::findOrFail($id);
        $entry->delete();

        return response()->json([
            'message' => 'Ledger entry deleted successfully'
        ], 200);
    }
}
