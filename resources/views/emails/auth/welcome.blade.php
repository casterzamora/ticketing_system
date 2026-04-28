<x-mail::message>
# Welcome to {{ config('app.name') }}, {{ $userName }}!

Your account has been created successfully. You can now browse events, book tickets, and manage your reservations.

<x-mail::button :url="$appUrl">
Browse Events
</x-mail::button>

If you have any questions, feel free to reach out.

Thanks,
**{{ config('app.name') }} Team**
</x-mail::message>
