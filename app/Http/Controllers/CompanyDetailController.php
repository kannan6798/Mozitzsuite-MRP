<?php

namespace App\Http\Controllers;

use App\Models\CompanyDetail;
use Illuminate\Http\Request;

class CompanyDetailController extends Controller
{
    public function index()
    {
        return response()->json(CompanyDetail::first());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'gstin' => 'nullable|string',
            'pan' => 'nullable|string',
            'address' => 'nullable|string',
            'bank_account_name' => 'nullable|string',
            'bank_account_number' => 'nullable|string',
            'ifsc' => 'nullable|string',
            'account_type' => 'nullable|string',
            'bank_name' => 'nullable|string',
            'branch' => 'nullable|string',
        ]);

        $company = CompanyDetail::first();
        if ($company) {
            $company->update($data);
        } else {
            $company = CompanyDetail::create($data);
        }

        return response()->json($company);
    }
}