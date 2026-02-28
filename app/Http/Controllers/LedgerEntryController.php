<?php

namespace App\Http\Controllers;

use App\Models\LedgerEntry;
use Illuminate\Http\Request;

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
            'id' => 'required|string',
            'user_id' => 'nullable|string',
            'category' => 'nullable|string',
            'company_name' => 'nullable|string',
            'document_type' => 'nullable|string',
            'document_date' => 'nullable|date',
            'document_number' => 'nullable|string',
            'debit' => 'nullable|numeric',
            'credit' => 'nullable|numeric',
        ]);

        return LedgerEntry::create($data);
    }
}
