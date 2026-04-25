<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class MailSmokeTest extends Command
{
    protected $signature = 'mail:smoke-test {to?}';

    protected $description = 'Send a quick SMTP smoke-test email.';

    public function handle(): int
    {
        $to = $this->argument('to') ?: config('mail.from.address');

        try {
            Mail::raw('Live Tix SMTP smoke test', function ($m) use ($to) {
                $m->to($to)->subject('Live Tix SMTP Smoke Test');
            });

            $this->info('mail_test_sent_to=' . $to);
            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error('mail_test_failed=' . $e->getMessage());
            return self::FAILURE;
        }
    }
}
