<?php

namespace App\Http\Controllers;

use App\Models\PaymentHistory;
use Illuminate\Http\Request;

class PaymentHistoryController extends Controller
{
    public function index()
    {
        return PaymentHistory::all();
    }

    public function show($id)
    {
        return PaymentHistory::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'payable_id' => 'required|string',
            'payment_date' => 'required|date',
            'payment_mode' => 'required|string',
            'reference_number' => 'nullable|string',
            'paid_amount' => 'required|numeric',
            'remarks' => 'nullable|string',
            'created_by' => 'nullable|string',
        ]);

        return PaymentHistory::create($data);
    }
}
