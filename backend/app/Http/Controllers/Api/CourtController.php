<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Court;
use App\Models\CourtSession;
use App\Models\Product;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Carbon\Carbon;

class CourtController extends Controller
{
    // GET /courts
    public function index()
    {
        return Court::all();
    }

    // GET /courts/:id
    public function show($id)
    {
        return Court::findOrFail($id);
    }

    // POST /courts
    public function store(Request $request)
    {
        $court = Court::create($request->validate([
            'name'           => 'required|string|max:100',
            'type'           => 'required|in:indoor,outdoor',
            'price_per_hour' => 'required|numeric|min:0',
            'status'         => 'sometimes|string',
        ]));
        return response()->json($court, 201);
    }

    // PUT /courts/:id
    public function update(Request $request, $id)
    {
        $court = Court::findOrFail($id);
        $court->update($request->validate([
            'name'           => 'sometimes|string|max:100',
            'type'           => 'sometimes|in:indoor,outdoor',
            'price_per_hour' => 'sometimes|numeric|min:0',
            'status'         => 'sometimes|string',
        ]));
        return response()->json($court);
    }

    // DELETE /courts/:id
    public function destroy($id)
    {
        Court::findOrFail($id)->delete();
        return response()->json(['message' => 'Court deleted']);
    }

    // GET /sessions (history)
    public function history()
    {
        // Return sessions with court and order items
        return CourtSession::with(['court', 'orderItems.product'])
            ->orderBy('created_at', 'desc')
            ->get();
    }

    // POST /courts/:id/start
    public function startSession(Request $request, $id)
    {
        $court = Court::findOrFail($id);

        if ($court->status === 'active') {
            return response()->json(['message' => 'Court is already active'], 400);
        }

        $session = CourtSession::create([
            'court_id'    => $court->id,
            'start_time'  => Carbon::now(),
            'status'      => 'active',
            'total_price' => 0,
        ]);

        $court->update(['status' => 'active']);

        return response()->json([
            'message' => 'Session started',
            'session' => $session,
        ]);
    }

    // POST /courts/:id/stop
    public function stopSession(Request $request, $id)
    {
        $court = Court::findOrFail($id);

        $session = CourtSession::where('court_id', $court->id)
            ->where('status', 'active')
            ->first();

        if (!$session) {
            return response()->json(['message' => 'No active session found'], 404);
        }

        $session->end_time   = Carbon::now();
        $session->status     = 'finished';
        $session->total_price = $session->calculateFinalPrice();
        $session->save();

        $court->update(['status' => 'available']);

        return response()->json([
            'message'     => 'Session stopped',
            'final_price' => $session->total_price,
            'session'     => $session->load(['court', 'orderItems.product']),
        ]);
    }

    // GET /courts/:id/session — active session info
    public function activeSession($id)
    {
        $session = CourtSession::where('court_id', $id)
            ->where('status', 'active')
            ->with(['orderItems.product', 'court'])
            ->first();

        if (!$session) {
            return response()->json(null);
        }

        return response()->json($session);
    }

    // POST /courts/:id/order — add product to active session
    public function addOrder(Request $request, $id)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity'   => 'required|integer|min:1',
        ]);

        $session = CourtSession::where('court_id', $id)
            ->where('status', 'active')
            ->first();

        if (!$session) {
            return response()->json(['message' => 'No active session'], 404);
        }

        $product = Product::findOrFail($data['product_id']);

        $item = OrderItem::where('court_session_id', $session->id)
            ->where('product_id', $product->id)
            ->first();

        if ($item) {
            $item->quantity += $data['quantity'];
            $item->subtotal = $item->quantity * $item->price;
            $item->save();
        } else {
            $item = OrderItem::create([
                'court_session_id' => $session->id,
                'product_id'       => $product->id,
                'quantity'         => $data['quantity'],
                'price'            => $product->price,
                'subtotal'         => $product->price * $data['quantity'],
            ]);
        }

        return response()->json($item->load('product'));
    }

    // POST /courts/:id/order/decrease
    public function decreaseOrder(Request $request, $id)
    {
        $data = $request->validate([
            'product_id' => 'required|exists:products,id',
        ]);

        $session = CourtSession::where('court_id', $id)
            ->where('status', 'active')
            ->first();

        if (!$session) {
            return response()->json(['message' => 'No active session'], 404);
        }

        $item = OrderItem::where('court_session_id', $session->id)
            ->where('product_id', $data['product_id'])
            ->first();

        if (!$item) {
            return response()->json(['message' => 'Item not in order'], 404);
        }

        if ($item->quantity > 1) {
            $item->quantity -= 1;
            $item->subtotal = $item->quantity * $item->price;
            $item->save();
        } else {
            $item->delete();
            return response()->json(['deleted' => true]);
        }

        return response()->json($item->load('product'));
    }
}
