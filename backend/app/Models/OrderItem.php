<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $table = 'order_items';

    protected $fillable = [
        'court_session_id',
        'product_id',
        'quantity',
        'price',
        'subtotal',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function courtSession()
    {
        return $this->belongsTo(CourtSession::class, 'court_session_id');
    }
}
