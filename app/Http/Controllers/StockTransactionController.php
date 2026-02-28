<?php

namespace App\Http\Controllers;

use App\Models\StockTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class StockTransactionController extends Controller
{
    public function index()
    {
        $transactions = StockTransaction::orderBy('transaction_date','desc')->get();
        return view('stock_transactions.index', compact('transactions'));
    }

    public function import(Request $request)
    {
        $file = $request->file('csv');

        $rows = file($file);
        foreach ($rows as $row) {
            $cols = explode(';', trim($row));

            StockTransaction::create([
                'id'               => $cols[0] ?? Str::uuid(),
                'item_code'        => $cols[1] ?? null,
                'transaction_type' => $cols[2] ?? null,
                'reference_type'   => $cols[3] ?? null,
                'reference_number' => $cols[4] ?? null,
                'quantity'         => (float)($cols[5] ?? 0),
                'unit_cost'        => (float)($cols[6] ?? 0),
                'transaction_date' => $cols[7] ?? null,
                'notes'            => $cols[8] ?? null,
            ]);
        }

        return redirect()->back()->with('success', 'Imported successfully');
    }
}
