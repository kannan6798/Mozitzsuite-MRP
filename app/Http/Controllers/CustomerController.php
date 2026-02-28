<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    // List all customers
    public function index()
    {
        return response()->json(Customer::all());
    }

    // Show a single customer
    public function show($id)
    {
        $customer = Customer::findOrFail($id);
        return response()->json($customer);
    }

    // Create a new customer
    public function store(Request $request)
    {
        $data = $request->validate([
            'customer_name' => 'required|string',
            'customer_code' => 'nullable|string|unique:customers,customer_code',
            'customer_type' => 'nullable|string',
            'contact_person' => 'nullable|string',
            'primary_contact' => 'nullable|string',
            'mobile' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'billing_address' => 'nullable|string',
            'shipping_address' => 'nullable|string',
            'address_line1' => 'nullable|string',
            'address_line2' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'country' => 'nullable|string',
            'currency' => 'nullable|string',
            'gst_number' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'tier' => 'nullable|string',
            'status' => 'nullable|string',
            'company_name' => 'nullable|string',
            'pan_number' => 'nullable|string',
            'cin' => 'nullable|string',
            'industry_type' => 'nullable|string',
            'website' => 'nullable|string',
        ]);

        $customer = Customer::create($data);

        return response()->json($customer, 201);
    }

    // Update an existing customer
    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);

        $data = $request->validate([
            'customer_name' => 'required|string',
            'customer_code' => 'nullable|string|unique:customers,customer_code,' . $customer->id,
            'customer_type' => 'nullable|string',
            'contact_person' => 'nullable|string',
            'primary_contact' => 'nullable|string',
            'mobile' => 'nullable|string',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
            'billing_address' => 'nullable|string',
            'shipping_address' => 'nullable|string',
            'address_line1' => 'nullable|string',
            'address_line2' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'postal_code' => 'nullable|string',
            'country' => 'nullable|string',
            'currency' => 'nullable|string',
            'gst_number' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'tier' => 'nullable|string',
            'status' => 'nullable|string',
            'company_name' => 'nullable|string',
            'pan_number' => 'nullable|string',
            'cin' => 'nullable|string',
            'industry_type' => 'nullable|string',
            'website' => 'nullable|string',
        ]);

        $customer->update($data);

        return response()->json($customer);
    }

    // Delete a customer
    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();

        return response()->json(['message' => 'Customer deleted successfully']);
    }
}
