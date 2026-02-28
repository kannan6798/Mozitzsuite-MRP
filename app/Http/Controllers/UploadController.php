<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    public function upload(Request $request)
    {
        // Check if file exists
        if (!$request->hasFile('file')) {
            return response()->json(['error' => 'No file uploaded'], 400);
        }

        $file = $request->file('file');

        // Validate file (optional)
        $request->validate([
            'file' => 'required|file|mimes:pdf,docx,jpg,png|max:10240', // adjust types & size
        ]);

        // Store file in "public/uploads" folder
        $path = $file->store('uploads', 'public');

        // Generate accessible URL
        $url = Storage::url($path); // e.g., /storage/uploads/filename.pdf

        return response()->json(['url' => $url]);
    }
}