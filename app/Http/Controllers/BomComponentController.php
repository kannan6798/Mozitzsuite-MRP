<?php

namespace App\Http\Controllers;

use App\Models\BomComponent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class BomComponentController extends Controller
{
    public function index(Request $request)
{
    $request->validate([
        'bom_id' => 'required|string',
    ]);

    $bomId = $request->bom_id;

    $components = BomComponent::where('bom_id', $bomId)->get();

    return response()->json($components);
}
    public function show($id)
    {
        return BomComponent::findOrFail($id);
    }

    public function store(Request $request)
    {
        try {
            $components = $request->all(); // Expecting an array of components
            Log::info('Bulk store payload', ['payload' => $components]);

            $inserted = [];

            foreach ($components as $componentData) {
                $validator = Validator::make($componentData, [
                   
                    'bom_id' => 'required|string',
                    'item_seq' => 'nullable|integer',
                    'operation_seq' => 'nullable|integer',
                    'component' => 'nullable|string',
                    'description' => 'nullable|string',
                    'quantity' => 'nullable|integer',
                    'uom' => 'nullable|string',
                    'basis' => 'nullable|string',
                    'type' => 'nullable|string',
                    'status' => 'nullable|string',
                    'planning_percent' => 'nullable|integer',
                    'yield_percent' => 'nullable|integer',
                    'include_in_cost_rollup' => 'nullable|boolean',
                    'unit_cost' => 'nullable|numeric',
                    'total_cost' => 'nullable|numeric',
                    'created_at' => 'nullable|date',
                ]);

                if ($validator->fails()) {
                    Log::error('Validation failed for component', [
                        'component' => $componentData,
                        'errors' => $validator->errors()->all(),
                    ]);

                    return response()->json([
                        'error' => 'Validation failed',
                        'details' => $validator->errors(),
                    ], 422);
                }

                $validData = $validator->validated();
                  $validData['id'] = Str::uuid()->toString(); // ✅ Generate ID
                $inserted[] = BomComponent::create($validData);
            }

            return response()->json($inserted, 201);

        } catch (\Exception $e) {
            Log::error('BOMComponent bulk store failed', [
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

    $deletedCount = \App\Models\BomComponent::where('bom_id', $request->bom_id)->delete();

    return response()->json([
        'message' => "$deletedCount component(s) deleted successfully."
    ]);
}


public function update(Request $request, $id)
{
    try {
        $component = BomComponent::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'item_seq' => 'nullable|integer',
            'operation_seq' => 'nullable|integer',
            'component' => 'nullable|string',
            'description' => 'nullable|string',
            'quantity' => 'nullable|integer',
            'uom' => 'nullable|string',
            'basis' => 'nullable|string',
            'type' => 'nullable|string',
            'status' => 'nullable|string',
            'planning_percent' => 'nullable|integer',
            'yield_percent' => 'nullable|integer',
            'include_in_cost_rollup' => 'nullable|boolean',
            'unit_cost' => 'nullable|numeric',
            'total_cost' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'details' => $validator->errors(),
            ], 422);
        }

        $component->update($validator->validated());

        return response()->json([
            'message' => 'Component updated successfully',
            'data' => $component
        ]);

    } catch (\Exception $e) {
        Log::error('BOMComponent update failed', [
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