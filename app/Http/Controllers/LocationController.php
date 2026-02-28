<?php

namespace App\Http\Controllers;

use App\Models\Location;
use Illuminate\Http\Request;

class LocationController extends Controller
{
    public function index()
    {
        return Location::all();
    }

    public function show($id)
    {
        return Location::findOrFail($id);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|string',
            'location_name' => 'nullable|string',
            'legal_name' => 'nullable|string',
            'address' => 'nullable|string',
            'sell_enabled' => 'nullable|boolean',
            'make_enabled' => 'nullable|boolean',
            'buy_enabled' => 'nullable|boolean',
        ]);

        return Location::create($data);
    }
}
