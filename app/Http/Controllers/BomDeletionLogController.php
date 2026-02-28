<?php

namespace App\Http\Controllers;

use App\Models\BomDeletionLog;
use Illuminate\Http\Request;

class BomDeletionLogController extends Controller
{
    public function index()
    {
        return BomDeletionLog::all();
    }

    public function show($id)
    {
        return BomDeletionLog::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|string',
            'bom_id' => 'nullable|string',
            'item_code' => 'nullable|string',
            'item_name' => 'nullable|string',
            'revision' => 'nullable|string',
            'deleted_by' => 'nullable|string',
            'deleted_at' => 'nullable|date',
            'reason' => 'nullable|string',
            'created_at' => 'nullable|date',
        ]);

        return BomDeletionLog::create($data);
    }
}
