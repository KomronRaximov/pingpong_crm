<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Court extends Model
{
    protected $fillable = [
        'name',
        'type',
        'price_per_hour',
        'status',
    ];

    public function sessions()
    {
        return $this->hasMany(Session::class);
    }
}
