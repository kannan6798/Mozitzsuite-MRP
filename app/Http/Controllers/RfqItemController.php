<?php

namespace App\Http\Controllers;

use App\Models\RfqItem;
use Illuminate\Http\Request;

class RfqItemController extends Controller
{
    public function index()
    {
        $items = RfqItem::latest()->paginate(20);
        return view('rfq_items.index', compact('items'));
    }

    public function create()
    {
        return view('rfq_items.create');
    }

    public function store(Request $request)
    {
        $request->validate([
            'item_code' => 'nullable|string|max:255',
            'item_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'quantity' => 'nullable|integer',
            'required_date' => 'nullable|date',
        ]);

        RfqItem::create($request->all());

        return redirect()->route('rfq_items.index')
            ->with('success', 'RFQ Item created successfully.');
    }

    public function edit(RfqItem $rfqItem)
    {
        return view('rfq_items.edit', compact('rfqItem'));
    }

    public function update(Request $request, RfqItem $rfqItem)
    {
        $request->validate([
            'item_code' => 'nullable|string|max:255',
            'item_name' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'quantity' => 'nullable|integer',
            'required_date' => 'nullable|date',
        ]);

        $rfqItem->update($request->all());

        return redirect()->route('rfq_items.index')
            ->with('success', 'RFQ Item updated successfully.');
    }

    public function destroy(RfqItem $rfqItem)
    {
        $rfqItem->delete();

        return redirect()->route('rfq_items.index')
            ->with('success', 'RFQ Item deleted successfully.');
    }
}
