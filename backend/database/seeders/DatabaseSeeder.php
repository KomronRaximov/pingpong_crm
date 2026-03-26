<?php

namespace Database\Seeders;

use App\Models\Court;
use App\Models\Product;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Initial Courts
        Court::create(['name' => 'Court 1 (Main Show)', 'type' => 'indoor', 'price_per_hour' => 50, 'status' => 'available']);
        Court::create(['name' => 'Court 2 (Secondary)', 'type' => 'indoor', 'price_per_hour' => 40, 'status' => 'available']);
        Court::create(['name' => 'Court 3 (Outdoor A)', 'type' => 'outdoor', 'price_per_hour' => 30, 'status' => 'available']);
        Court::create(['name' => 'Court 4 (Outdoor B)', 'type' => 'outdoor', 'price_per_hour' => 30, 'status' => 'available']);
        Court::create(['name' => 'Court 5 (Clubhouse)', 'type' => 'indoor', 'price_per_hour' => 45, 'status' => 'available']);
        Court::create(['name' => 'Court 6 (Training)', 'type' => 'outdoor', 'price_per_hour' => 20, 'status' => 'available']);

        // Initial Products
        Product::create(['name' => 'Mineral Water (0.5L)', 'price' => 1.50]);
        Product::create(['name' => 'Tennis Balls (3 can)', 'price' => 12.00]);
        Product::create(['name' => 'Rental Racket', 'price' => 5.00]);
        Product::create(['name' => 'Grip Tape', 'price' => 3.50]);
        Product::create(['name' => 'Energy Drink', 'price' => 2.50]);
        Product::create(['name' => 'Towel (Rental)', 'price' => 2.00]);
    }
}
