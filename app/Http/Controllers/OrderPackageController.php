<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderPackage;

class OrderPackageController extends Controller
{
    // Get all packages
    public function index()
    {
        $packages = OrderPackage::latest()->get();

        return response()->json([
            'status' => true,
            'data' => $packages
        ]);
    }

    // Store package
    public function store(Request $request)
    {
        $request->validate([
            'order_number' => 'required',
            'customer_name' => 'required',
            'date' => 'required|date',
        ]);

        $package = OrderPackage::create($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Package created successfully',
            'data' => $package
        ]);
    }

    // Show single package
    public function show($id)
    {
        $package = OrderPackage::find($id);

        if (!$package) {
            return response()->json([
                'status' => false,
                'message' => 'Package not found'
            ]);
        }

        return response()->json($package);
    }

    // Update package
    public function update(Request $request, $id)
    {
        $package = OrderPackage::find($id);

        if (!$package) {
            return response()->json([
                'status' => false,
                'message' => 'Package not found'
            ]);
        }

        $package->update($request->all());

        return response()->json([
            'status' => true,
            'message' => 'Package updated successfully',
            'data' => $package
        ]);
    }

    // Delete package
    public function destroy($id)
    {
        $package = OrderPackage::find($id);

        if (!$package) {
            return response()->json([
                'status' => false,
                'message' => 'Package not found'
            ]);
        }

        $package->delete();

        return response()->json([
            'status' => true,
            'message' => 'Package deleted successfully'
        ]);
    }
}