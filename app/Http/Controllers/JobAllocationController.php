<?php

namespace App\Http\Controllers;

use App\Models\JobAllocation;
use Illuminate\Http\Request;

class JobAllocationController extends Controller
{
    public function index()
    {
        return JobAllocation::all();
    }

    public function show($id)
    {
        return JobAllocation::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'job_number' => 'nullable|string',
            'item_code' => 'nullable|string',
            'allocated_quantity' => 'nullable|numeric',
            'allocation_date' => 'nullable|date',
            'status' => 'nullable|string',
            'created_at' => 'nullable|date',
            'updated_at' => 'nullable|date',
        ]);

        return JobAllocation::create($data);
    }
}
