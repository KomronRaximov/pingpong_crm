<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        // Simple token check for admin operations
        $token = $request->header('X-Admin-Token');
        
        // Static token derived from env password for simplicity
        $expectedToken = md5(env('ADMIN_USERNAME') . env('ADMIN_PASSWORD'));

        if (!$token || $token !== $expectedToken) {
            return response()->json(['message' => 'Unauthorized Access'], 401);
        }

        return $next($request);
    }
}
