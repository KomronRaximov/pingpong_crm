<?php

namespace Database\Seeders;

use App\Models\Court;
use App\Models\Product;
use App\Models\CourtSession;
use App\Models\OrderItem;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── Seed Ping Pong Tables ─────────────────────────────────────
        Court::create(['name' => 'Table 1 (DHS Pro)', 'type' => 'indoor', 'price_per_hour' => 10, 'status' => 'available']);
        Court::create(['name' => 'Table 2 (DHS Pro)', 'type' => 'indoor', 'price_per_hour' => 10, 'status' => 'available']);
        Court::create(['name' => 'Table 3 (Stiga Master)', 'type' => 'indoor', 'price_per_hour' => 8, 'status' => 'available']);
        Court::create(['name' => 'Table 4 (Stiga Master)', 'type' => 'indoor', 'price_per_hour' => 8, 'status' => 'available']);
        Court::create(['name' => 'Table 5 (VIP Room)', 'type' => 'indoor', 'price_per_hour' => 20, 'status' => 'available']);
        Court::create(['name' => 'Table 6 (Training Robot)', 'type' => 'indoor', 'price_per_hour' => 15, 'status' => 'available']);

        // ── Seed Real Products & Services ──────────────────────────────
        Product::create(['name' => 'Mineral Water (0.5L)', 'price' => 1.50]);
        Product::create(['name' => 'Energy Drink (RedBull)', 'price' => 2.50]);
        Product::create(['name' => 'Coffee (Americano)', 'price' => 2.00]);
        Product::create(['name' => 'Tea (Green/Black)', 'price' => 1.00]);
        Product::create(['name' => 'Ping Pong Balls (DHS 3-Star)', 'price' => 3.00]);
        Product::create(['name' => 'Rental Racket (Pro)', 'price' => 5.00]);
        Product::create(['name' => 'Rental Racket (Standard)', 'price' => 2.00]);
        Product::create(['name' => 'Grip Tape (Butterfly)', 'price' => 4.00]);
        Product::create(['name' => 'Towel (Rental)', 'price' => 1.50]);
        Product::create(['name' => 'Snickers / Twix', 'price' => 1.50]);

        // ── Generate Dummy History for Analytics (Last 7 Days) ────────
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            
            // Generate 3 to 8 sessions per day
            $sessionsCount = rand(3, 8);
            for ($j = 0; $j < $sessionsCount; $j++) {
                $tableId = rand(1, 6);
                $durationHours = rand(1, 3);
                $startTime = $date->copy()->addHours(rand(10, 20))->addMinutes(rand(0, 59));
                $endTime = $startTime->copy()->addHours($durationHours)->addMinutes(rand(0, 30));
                
                $pricePerHour = Court::find($tableId)->price_per_hour;
                $diffInSeconds = $endTime->diffInSeconds($startTime);
                $courtCost = ($diffInSeconds / 3600) * $pricePerHour;
                
                $session = CourtSession::create([
                    'court_id' => $tableId,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'status' => 'completed',
                    'total_price' => $courtCost,
                    'created_at' => $startTime,
                    'updated_at' => $endTime
                ]);
                
                // Randomly add product orders to the session (60% chance)
                if (rand(1, 100) > 40) {
                    $orderCount = rand(1, 3);
                    $orderTotal = 0;
                    for ($k = 0; $k < $orderCount; $k++) {
                        $productId = rand(1, 10);
                        $qty = rand(1, 2);
                        $prod = Product::find($productId);
                        $subtotal = $prod->price * $qty;
                        $orderTotal += $subtotal;
                        
                        OrderItem::create([
                            'court_session_id' => $session->id,
                            'product_id' => $prod->id,
                            'quantity' => $qty,
                            'subtotal' => $subtotal,
                            'created_at' => $endTime,
                            'updated_at' => $endTime
                        ]);
                    }
                    // Update session total with ordered items
                    $session->update(['total_price' => $session->total_price + $orderTotal]);
                }
            }
        }
    }
}
