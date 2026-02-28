<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AuthController extends Controller
{
    // Register
    public function register(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6'
        ]);

        $user = User::create([
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        Auth::login($user);

        return response()->json([
            'user' => $user
        ]);
    }

    // Login
    public function login(Request $request)
    {
         $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]); 

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials'
            ], 401);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json([
            'user' => Auth::user()
        ]);
    }


     public function checkSession(Request $request)
    {
        return response()->json([
            'logged_in' => Auth::check(),
            'user' => Auth::user(),
        ]);
    }

    // Logout
    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'Logged out'
        ]);
    }

    // Get authenticated user
    public function user()
    {
        return response()->json(Auth::user());
    }
}
