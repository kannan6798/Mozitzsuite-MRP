<?php

namespace App\Http\Controllers;

use App\Models\BomOperation;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class BomOperationController extends Controller
{
    public function index()
    {
        return BomOperation::all();
    }

    public function show($id)
    {
        return BomOperation::findOrFail($id);
    }

   public function store(Request $request)
{
    try {
        $operations = $request->all();
        $inserted = [];

        foreach ($operations as $opData) {
            $validator = Validator::make($opData, [
                'bom_id' => 'required|string',
                'operation_seq' => 'nullable|integer',
                'operation_code' => 'required|string',
                'description' => 'nullable|string',
                'department' => 'nullable|string',
                'work_center' => 'nullable|string',
                'routing_enabled' => 'boolean',
                'labor_cost' => 'required|numeric',
                'machine_cost' => 'required|numeric',
                'overhead_cost' => 'required|numeric',
                'setup_time' => 'required|numeric',
                'run_time' => 'required|numeric',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'error' => 'Validation failed',
                    'details' => $validator->errors(),
                ], 422);
            }

            $validData = $validator->validated();
            $validData['id'] = Str::uuid()->toString();
            $inserted[] = BomOperation::create($validData);
        }

        return response()->json($inserted, 201);

    } catch (\Exception $e) {
        Log::error('BOMOperation bulk store failed', [
            'payload' => $request->all(),
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'error' => 'Internal Server Error',
            'message' => $e->getMessage()
        ], 500);
    }
}

public function deleteByBomId(Request $request)
{
    $request->validate([
        'bom_id' => 'required|string',
    ]);

    $deletedOperations = \App\Models\BomOperation::where('bom_id', $request->bom_id)->delete();
    $deletedComponents = \App\Models\BomComponent::where('bom_id', $request->bom_id)->delete();

    return response()->json([
        'message' => "$deletedOperations operation(s) and $deletedComponents component(s) deleted successfully."
    ]);
}

public function update(Request $request, $id)
{
    try {
        $operation = BomOperation::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'operation_seq' => 'nullable|integer',
            'operation_code' => 'required|string',
            'description' => 'nullable|string',
            'department' => 'nullable|string',
            'work_center' => 'nullable|string',
            'routing_enabled' => 'boolean',
            'labor_cost' => 'required|numeric',
            'machine_cost' => 'required|numeric',
            'overhead_cost' => 'required|numeric',
            'setup_time' => 'required|numeric',
            'run_time' => 'required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $validator->errors(),
            ], 422);
        }

        $operation->update($validator->validated());

        return response()->json([
            'message' => 'Operation updated successfully',
            'data' => $operation
        ]);

    } catch (\Exception $e) {
        Log::error('BOMOperation update failed', [
            'id' => $id,
            'error' => $e->getMessage(),
        ]);

        return response()->json([
            'error' => 'Internal Server Error',
            'message' => $e->getMessage()
        ], 500);
    }
} 
}
