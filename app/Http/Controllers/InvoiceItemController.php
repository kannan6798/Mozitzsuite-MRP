<?php

namespace App\Http\Controllers;

use App\Models\InvoiceItem;
use Illuminate\Http\Request;

class InvoiceItemController extends Controller
{
    // Get all invoice items
    public function index()
    {
        return InvoiceItem::all();
    }

    // Get a single invoice item
    public function show($id)
    {
        return InvoiceItem::findOrFail($id);
    }

    // Create a new invoice item
    public function store(Request $request)
    {
        $data = $request->validate([
            'invoice_id'    => 'required|string|exists:invoices,id',
            'item'          => 'nullable|string',
            'description'   => 'nullable|string',
            'hsn'           => 'nullable|string',
            'material'      => 'nullable|string',
            'quantity'      => 'nullable|numeric',
            'rate'          => 'nullable|numeric',
            
            'sgst_percent'  => 'nullable|numeric',
            'sgst_amount'   => 'nullable|numeric',
            'cgst_percent'  => 'nullable|numeric',
            'cgst_amount'   => 'nullable|numeric',
             'igst_percent'       => 'nullable|numeric',
            'igst_amount'        => 'nullable|numeric',
            'vat_percent'        => 'nullable|numeric',
            'vat_amount'         => 'nullable|numeric',
            'sales_tax_percent'  => 'nullable|numeric',
            'sales_tax_amount'   => 'nullable|numeric',
            'tds_amount'   => 'nullable|numeric',
            'total'         => 'nullable|numeric',
        ]);

        $invoiceItem = new InvoiceItem($data);

        // Calculate totals if quantity and rate are provided
        $invoiceItem->calculateTotals();

        $invoiceItem->save();

        return response()->json($invoiceItem, 201);
    }

    // Update an existing invoice item
    public function update(Request $request, $id)
    {
        $invoiceItem = InvoiceItem::findOrFail($id);

        $data = $request->validate([
            'item'          => 'nullable|string',
            'description'   => 'nullable|string',
            'hsn'           => 'nullable|string',
            'material'      => 'nullable|string',
            'quantity'      => 'nullable|numeric',
            'rate'          => 'nullable|numeric',
           
            'sgst_percent'  => 'nullable|numeric',
            'sgst_amount'   => 'nullable|numeric',
            'cgst_percent'  => 'nullable|numeric',
            'cgst_amount'   => 'nullable|numeric',
             'igst_percent'       => 'nullable|numeric',
            'igst_amount'        => 'nullable|numeric',
            'vat_percent'        => 'nullable|numeric',
            'vat_amount'         => 'nullable|numeric',
            'sales_tax_percent'  => 'nullable|numeric',
            'sales_tax_amount'   => 'nullable|numeric',
            'tds_amount'   => 'nullable|numeric',
        ]);

        $invoiceItem->fill($data);

        // Recalculate totals if quantity/rate or taxes changed
        $invoiceItem->calculateTotals();

        $invoiceItem->save();

        return response()->json($invoiceItem);
    }

    // Delete an invoice item
    public function destroy($id)
    {
        $invoiceItem = InvoiceItem::findOrFail($id);
        $invoiceItem->delete();

        return response()->json(['message' => 'Invoice item deleted']);
    }
}
