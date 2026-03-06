<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\InventoryItem; // Assuming you have inventory table
use App\Models\InventoryStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'order_no' => 'nullable|string|unique:orders,order_no',
            'customer' => 'required|string',
            'order_type' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.item_code' => 'nullable|string',
            'items.*.item_name' => 'nullable|string',
            'items.*.uom' => 'nullable|string',
            'items.*.quantity_ordered' => 'nullable|numeric|min:1',
            'items.*.rate' => 'nullable|numeric|min:0',
            'items.*.tax' => 'nullable|numeric|min:0',
            'items.*.totalAmount' => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $orderData = $request->except('items');

            // Create the order
            $order = Order::create($orderData);

            // Loop through items safely
            foreach ($request->items as $item) {
                // Use null coalescing to avoid undefined key errors
                $itemCode = $item['item_code'] ?? null;
                $quantity = $item['quantity'] ?? 0;

                $order->update([ // Update order table with item-level info
                    'item_code' => $itemCode,
                    'item_name' => $item['item_name'] ?? null,
                    'uom' => $item['uom'] ?? 'pcs',
                    'quantity' => $quantity,
                    'rate' => $item['rate'] ?? 0,
                    'tax' => $item['tax'] ?? 0,
                    'total_amount' => $item['total_amount'] ?? 0,
                ]);

                // Update inventory if item_code exists
                if ($itemCode) {
                    $inventoryItem = InventoryStock::where('item_code', $itemCode)->first();
                    if ($inventoryItem) {
                        $inventoryItem->allocated_quantity += $quantity;
                        $inventoryItem->save();
                    }
                }
            }

            DB::commit();

            return response()->json($order, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order creation failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'message' => 'Failed to create order',
                'error' => $e->getMessage()
            ], 500);
        }
    }
   // Fetch all orders
    public function index()
    {
        try {
            $orders = Order::orderBy('order_date', 'desc')->get();

            // Build fake 'items' array for frontend compatibility
            $orders->transform(function ($order) {
                $order->items = [
                    [
                        'item_code' => $order->item_code,
                        'item_name' => $order->item_name,
                        'uom' => $order->uom,
                        'quantity' => $order->quantity,
                        'rate' => $order->rate,
                        'tax' => $order->tax,
                        'total_amount' => $order->total_amount,
                        'item_location' => $order->item_location,
                        'available_stock' => $order->available_stock,
                    ]
                ];

                $order->order_total = $order->total_amount; // total amount for frontend
                 $order->status = $order->status;
                return $order;
            });

            return response()->json([
                'success' => true,
                'data' => $orders
            ]);
        } catch (\Exception $e) {
            Log::error('Fetch orders failed: ' . $e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch orders',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateStatus(Request $request, $id)
{
    $request->validate([
        'status' => 'required|string',
    ]);

    $order = Order::findOrFail($id);
    $order->status = $request->status;
    $order->save();

    return response()->json([
        'success' => true,
        'message' => 'Order status updated successfully',
        'data' => $order
    ]);
}

  public function generateInsights(Request $request)
    {
        $orders = $request->input('orders', []);

        if (empty($orders)) {
            return response()->json([
                'insights' => null,
                'message' => 'No orders provided',
            ], 400);
        }

        try {
            // Example: call OpenAI or other AI service
            // Here we just generate a simple summary for demo purposes
            $summary = "Total Orders: " . count($orders) . "\n";
            $totalAmount = array_sum(array_map(fn($o) => $o['orderTotal'] ?? 0, $orders));
            $summary .= "Total Amount: ₹" . number_format($totalAmount, 2) . "\n";

            $deliveredCount = count(array_filter($orders, fn($o) => $o['deliveryStatus'] === 'Delivered'));
            $summary .= "Delivered Orders: " . $deliveredCount . "\n";

            $pendingCount = count(array_filter($orders, fn($o) => $o['deliveryStatus'] !== 'Delivered'));
            $summary .= "Pending Orders: " . $pendingCount . "\n";

            // You can replace above with AI API call, e.g., OpenAI
            // $aiResponse = Http::withHeaders([...])->post(...);

            return response()->json([
                'insights' => $summary,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'insights' => null,
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}