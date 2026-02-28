<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    // Get all categories
    public function index()
    {
        return response()->json(Category::all());
    }

    // Add a new category
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
        ]);

        $category = Category::create($data);

        return response()->json($category, 201);
    }

    // Optional: Get category by ID
    public function show($id)
    {
        $category = Category::findOrFail($id);
        return response()->json($category);
    }
}