<?php

namespace App\Http\Controllers;

use App\Models\InventoryStock;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;

class InventoryStockController extends Controller
{
    // Get all inventory items
   public function index(Request $request)
{
    $query = InventoryStock::query();

    // Optional search
    if ($request->has('search')) {
        $search = $request->query('search');
        $query->where('item_name', 'like', "%{$search}%")
              ->orWhere('item_code', 'like', "%{$search}%");
    }

    // Fetch items
    $items = $query->get()->map(function ($item) {
        $quantityOnHand = (float) ($item->quantity_on_hand ?? 0);
        $committedQuantity = (float) ($item->committed_quantity ?? 0);
        $unitCost = (float) ($item->unit_cost ?? 0);
        $sellingPrice = (float) ($item->selling_price ?? 0);

        $availableQuantity = (float) ($item->available_quantity ?? ($quantityOnHand - $committedQuantity));

        // Potential = Available + Expected - Committed (example, adjust if your frontend calculates differently)
        $expectedQuantity = (float) ($item->expected_quantity ?? 0);
        $potential = $availableQuantity + $expectedQuantity;

        return [
            'id' => $item->id,
            'itemCode' => $item->item_code,
            'itemName' => $item->item_name,
            'item_type' => $item->item_type,
            'uom' => $item->uom ?? '',
            'defaultSupplier' => $item->default_supplier ?? '-',
            'purchasePrice' => $unitCost,
            'defaultSalesPrice' => $sellingPrice,
            'quantityOnHand' => $quantityOnHand,
            'committedQuantity' => $committedQuantity,
            'availableQuantity' => $availableQuantity,
            'expectedQuantity' => $expectedQuantity,
            'potentialQuantity' => $potential,
            'reorderPoint' => $item->reorder_point ?? 0,
            'usabilityMake' => $item->usability_make,
            'usabilityBuy' => $item->usability_buy,
            'usabilitySell' => $item->usability_sell,
            'location' => $item->location ?? '-',
            'grnRequired' => $item->grn_required,
            'locationTracking' => $item->location_tracking,
            'hsnCode' => $item->hsn_code,
            'taxRate' => $item->tax_rate,
            'lastTransactionDate' => $item->last_transaction_date,
            'description' => $item->description ?? '',
            'categories' => $item->categories ?? '',
        ];
    });

    return response()->json([
        'items' => $items,
    ]);
}

    // Get single inventory item
    public function show($id)
    {
        $item = InventoryStock::findOrFail($id);
        return response()->json($item, 200);
    }

    // Create inventory item
    public function store(Request $request)
    {
          Log::info('Store payload:', $request->all());
        try {
            $data = $this->validateData($request);
            Log::info('Validated data:', $data);


        // Auto-generate item_code if not provided
        if (empty($data['item_code'])) {
            $prefixMap = ['Product' => 'PRD', 'Component' => 'MAT'];
            $prefix = $prefixMap[$data['item_type']] ?? 'IT';

            // Get last item of this type
            $lastItem = InventoryStock::where('item_type', $data['item_type'])
                            ->orderBy('id', 'desc')
                            ->first();

            $lastNumber = 0;
            if ($lastItem && preg_match('/-(\d+)$/', $lastItem->item_code, $matches)) {
                $lastNumber = (int) $matches[1];
            }

            $nextNumber = $lastNumber + 1;
            $data['item_code'] = $prefix . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
        }

            // Ensure numeric fields are numbers, never empty strings
            $data['quantity_on_hand'] = isset($data['quantity_on_hand']) ? (float) $data['quantity_on_hand'] : 0;
            $data['allocated_quantity'] = isset($data['allocated_quantity']) ? (float) $data['allocated_quantity'] : 0;
            $data['committed_quantity'] = isset($data['committed_quantity']) ? (float) $data['committed_quantity'] : 0;
            $data['unit_cost'] = isset($data['unit_cost']) ? (float) $data['unit_cost'] : 0;
            $data['selling_price'] = isset($data['selling_price']) ? (float) $data['selling_price'] : 0;

            // Calculate available_quantity
            $data['available_quantity'] = $data['available_quantity'] ?? ($data['quantity_on_hand'] - $data['allocated_quantity'] - $data['committed_quantity']);

            // Force booleans
            $data['auto_reorder'] = isset($data['auto_reorder']) ? (bool) $data['auto_reorder'] : false;
            $data['grn_required'] = isset($data['grn_required']) ? (bool) $data['grn_required'] : false;
            $data['usability_make'] = isset($data['usability_make']) ? (bool) $data['usability_make'] : false;
            $data['usability_buy'] = isset($data['usability_buy']) ? (bool) $data['usability_buy'] : false;
            $data['usability_sell'] = isset($data['usability_sell']) ? (bool) $data['usability_sell'] : false;
            $data['location_tracking'] = isset($data['location_tracking']) ? (bool) $data['location_tracking'] : false;
            $data['auto_generate_serial'] = isset($data['auto_generate_serial']) ? (bool) $data['auto_generate_serial'] : false;

            $item = InventoryStock::create($data);

            return response()->json($item, 201);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Something went wrong',
                'error' => $e->getMessage(),
                 'trace' => $e->getTraceAsString(),
            ], 500);
        }
    }

    // Update inventory item
      public function update(Request $request, $id)
    {
        $item = InventoryStock::findOrFail($id);

        try {
            $data = $this->validateData($request);

            // Ensure numeric fields are numbers, never empty strings
            $data['quantity_on_hand'] = isset($data['quantity_on_hand']) ? (float) $data['quantity_on_hand'] : $item->quantity_on_hand;
            $data['allocated_quantity'] = isset($data['allocated_quantity']) ? (float) $data['allocated_quantity'] : $item->allocated_quantity;
            $data['committed_quantity'] = isset($data['committed_quantity']) ? (float) $data['committed_quantity'] : $item->committed_quantity;
            $data['unit_cost'] = isset($data['unit_cost']) ? (float) $data['unit_cost'] : $item->unit_cost;
            $data['selling_price'] = isset($data['selling_price']) ? (float) $data['selling_price'] : $item->selling_price;

            // Calculate available_quantity
            $data['available_quantity'] = $data['available_quantity'] ?? ($data['quantity_on_hand'] - $data['allocated_quantity'] - $data['committed_quantity']);

            // Force booleans
            $data['auto_reorder'] = isset($data['auto_reorder']) ? (bool) $data['auto_reorder'] : $item->auto_reorder;
            $data['grn_required'] = isset($data['grn_required']) ? (bool) $data['grn_required'] : $item->grn_required;
            $data['usability_make'] = isset($data['usability_make']) ? (bool) $data['usability_make'] : $item->usability_make;
            $data['usability_buy'] = isset($data['usability_buy']) ? (bool) $data['usability_buy'] : $item->usability_buy;
            $data['usability_sell'] = isset($data['usability_sell']) ? (bool) $data['usability_sell'] : $item->usability_sell;
            $data['location_tracking'] = isset($data['location_tracking']) ? (bool) $data['location_tracking'] : $item->location_tracking;
            $data['auto_generate_serial'] = isset($data['auto_generate_serial']) ? (bool) $data['auto_generate_serial'] : $item->auto_generate_serial;

            $item->update($data);

            return response()->json($item, 200);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Validation Failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error updating item',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Delete inventory item
    public function destroy($id)
    {
        $item = InventoryStock::findOrFail($id);
        $item->delete();

        return response()->json([
            'message' => 'Inventory item deleted successfully'
        ], 200);
    }

    // Centralized validation
     private function validateData(Request $request)
    {
        return $request->validate([
            'item_code' => 'nullable|string|max:50',
            'item_name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'item_type' => 'required|string|in:Product,Component',
            'quantity_on_hand' => 'nullable|numeric|min:0',
            'allocated_quantity' => 'nullable|numeric|min:0',
            'available_quantity' => 'nullable|numeric|min:0',
            'unit_cost' => 'nullable|numeric|min:0',
            'selling_price' => 'nullable|numeric|min:0',
            'hsn_code' => 'nullable|string|max:20',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'location' => 'required|string|max:100',
            'reorder_point' => 'nullable|numeric|min:0',
            'last_transaction_date' => 'nullable|date',
            'committed_quantity' => 'nullable|numeric|min:0',
            'barcode' => 'nullable|string|max:50',
            'item_mode' => 'nullable|string|in:batch,variant',
            'variant_name' => 'nullable|string|max:100',
            'variant_attributes' => 'nullable|string|max:200',
            'default_supplier' => 'nullable|string|max:100',
            'auto_reorder' => 'nullable|boolean',
            'grn_required' => 'nullable|boolean',
            'categories' => 'nullable|string',
            'usability_make' => 'nullable|boolean',
            'usability_buy' => 'nullable|boolean',
            'usability_sell' => 'nullable|boolean',
            'location_tracking' => 'nullable|boolean',
            'auto_generate_serial' => 'nullable|boolean',
            'serial_number_format' => 'nullable|string|max:50',
            'lead_time_days' => 'nullable|integer|min:0',
            'safety_stock' => 'nullable|integer|min:0',
        ]);
    }
}