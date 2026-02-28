<?php

namespace App\Http\Controllers;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Rfq;
use App\Models\RfqItem;
use App\Models\RfqVendor;
use Illuminate\Http\Request;

class RfqController extends Controller
{

public function store(Request $request)
{
    DB::beginTransaction();

    try {
        $rfq = Rfq::create([
            'id' => Str::uuid(),
            'rfq_number' => $request->rfq_number,
            'title' => $request->title,
            'status' => $request->status,
            'payment_terms' => $request->payment_terms,
            'delivery_location' => $request->delivery_location,
            'notes' => $request->notes,
        ]);

        // Insert Items
        foreach ($request->items as $item) {
            RfqItem::create([
                'id' => Str::uuid(),
                'rfq_id' => $rfq->id,
                'item_code' => $item['item_code'],
                'item_name' => $item['item_name'],
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'required_date' => $item['required_date'],
            ]);
        }

        // Insert Vendors
        foreach ($request->vendors as $vendor) {
            RfqVendor::create([
                'id' => Str::uuid(),
                'rfq_id' => $rfq->id,
                'vendor_name' => $vendor['vendor_name'],
                'vendor_email' => $vendor['vendor_email'],
                'vendor_contact' => $vendor['vendor_contact'],
                'status' => $vendor['status'],
            ]);
        }

        DB::commit();

        return response()->json([
            'message' => 'RFQ created successfully',
            'rfq_id' => $rfq->id
        ], 201);

    } catch (\Exception $e) {
        DB::rollBack();

        return response()->json([
            'message' => $e->getMessage()
        ], 500);
    }
}

}
