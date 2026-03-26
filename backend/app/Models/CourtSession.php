<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class CourtSession extends Model
{
    protected $table = 'court_sessions';

    protected $fillable = [
        'court_id',
        'start_time',
        'end_time',
        'total_price',
        'status',
    ];

    public function court()
    {
        return $this->belongsTo(Court::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'court_session_id');
    }

    public function calculateFinalPrice(): float
    {
        $start = Carbon::parse($this->start_time);
        $end   = Carbon::parse($this->end_time ?? Carbon::now());

        $durationHours = $start->diffInMinutes($end) / 60;
        $courtCost     = $durationHours * ($this->court->price_per_hour ?? 0);
        $productCost   = $this->orderItems()->sum('subtotal') ?? 0;

        return round($courtCost + $productCost, 2);
    }
}
