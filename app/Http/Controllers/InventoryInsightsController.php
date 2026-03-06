<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class InventoryInsightsController extends Controller
{
    public function generateInsights(Request $request)
    {
        $inventory = $request->input('inventory', []);

        if (empty($inventory)) {
            return response()->json([
                'message' => 'No inventory data provided'
            ], 400);
        }

        $insights = collect($inventory)->map(function ($item) {
            $available = $item['availableQuantity'] ?? 0;
            $reorderPoint = $item['reorderPoint'] ?? 0;
            $sellingPrice = $item['sellingPrice'] ?? 0;
            $unitCost = $item['purchasePrice'] ?? 0;

            $profitMargin = $sellingPrice - $unitCost;

            return [
                'itemCode' => $item['itemCode'] ?? null,
                'insight' => $available < $reorderPoint
                    ? 'Stock below reorder point, consider replenishing'
                    : 'Stock level sufficient',
                'profitMargin' => $profitMargin,
            ];
        });

        return response()->json([
            'insights' => $insights
        ]);
    }
}