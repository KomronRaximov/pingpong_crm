<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reservation extends Model
{
    protected $fillable = [
        'court_id',
        'client_name',
        'client_phone',
        'start_time',
        'duration_minutes',
        'status',
    ];

    public function court()
    {
        return $this->belongsTo(Court::class);
    }
}
