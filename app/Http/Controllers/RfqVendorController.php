<?php

namespace App\Http\Controllers;

use App\Models\RfqVendor;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RfqVendorController extends Controller
{
    public function index()
    {
        $vendors = RfqVendor::orderBy('created_at', 'desc')->get();
        return view('rfq_vendors.index', compact('vendors'));
    }

    public function import(Request $request)
    {
        $file = $request->file('csv');

        $rows = file($file);
        foreach ($rows as $row) {
            $cols = explode(';', trim($row));

            RfqVendor::create([
                'id'             => $cols[0] ?? Str::uuid(),
                'rfq_id'         => $cols[1] ?? null,
                'vendor_name'    => $cols[2] ?? null,
                'vendor_email'   => $cols[3] ?? null,
                'vendor_contact' => $cols[4] ?? null,
                'status'         => $cols[5] ?? null,
                'sent_at'        => $cols[6] ?? null,
                'responded_at'   => $cols[7] ?? null,
            ]);
        }

        return redirect()->back()->with('success', 'Imported successfully');
    }
}
