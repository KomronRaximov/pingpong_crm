<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CourtController;
use App\Http\Controllers\Api\ProductController;

Route::prefix('v1')->group(function () {

    // Courts CRUD
    Route::get('/courts',          [CourtController::class, 'index']);
    Route::post('/courts',         [CourtController::class, 'store']);
    Route::get('/courts/{id}',     [CourtController::class, 'show']);
    Route::put('/courts/{id}',     [CourtController::class, 'update']);
    Route::delete('/courts/{id}',  [CourtController::class, 'destroy']);

    // Session management
    Route::get('/sessions',             [CourtController::class, 'history']); // New: list all sessions
    Route::post('/courts/{id}/start',   [CourtController::class, 'startSession']);
    Route::post('/courts/{id}/stop',    [CourtController::class, 'stopSession']);
    Route::get('/courts/{id}/session',  [CourtController::class, 'activeSession']);

    // Product ordering per court session
    Route::post('/courts/{id}/order',          [CourtController::class, 'addOrder']);
    Route::post('/courts/{id}/order/decrease', [CourtController::class, 'decreaseOrder']); // New

    // Products CRUD
    Route::get('/products',         [ProductController::class, 'index']);
    Route::post('/products',        [ProductController::class, 'store']);
    Route::put('/products/{id}',    [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Stats
    Route::get('/stats', function () {
        return response()->json([
            'total_courts'    => \App\Models\Court::count(),
            'active_sessions' => \App\Models\CourtSession::where('status', 'active')->count(),
            'today_revenue'   => \App\Models\CourtSession::whereDate('created_at', \Carbon\Carbon::today())->sum('total_price'),
        ]);
    });

    // Reservations
    Route::get('/reservations', function () {
        return \App\Models\Reservation::all();
    });
    Route::post('/reservations', function (\Illuminate\Http\Request $request) {
        $data = $request->validate([
            'court_id' => 'required|exists:courts,id',
            'client_name' => 'required|string|max:100',
            'client_phone' => 'required|string|max:20',
            'start_time' => 'required|date',
            'duration_minutes' => 'required|integer|min:15',
        ]);
        return \App\Models\Reservation::create($data);
    });
});
