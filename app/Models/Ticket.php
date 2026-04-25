<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    protected $fillable = [
        'booking_id',
        'event_id',
        'ticket_type_id',
        'ticket_code',
        'qr_payload',
        'is_active',
        'checked_in_at',
    ];

    protected $casts = [
        'checked_in_at' => 'datetime',
    ];

    public function booking()
    {
        return $this->belongsTo(Booking::class);
    }

    public function ticketType()
    {
        return $this->belongsTo(TicketType::class);
    }

    public function event()
    {
        return $this->belongsTo(Event::class);
    }
}
