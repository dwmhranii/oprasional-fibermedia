<?php

use App\Jobs\CheckComplaintSlaJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('sla:check-pending-validation')->everyFifteenMinutes();
Schedule::command('sla:check-provisioning')->everyFifteenMinutes();
Schedule::command('sla:check-installation')->everyFifteenMinutes();
Schedule::command('sla:check-phase2-escalation')->hourly();
Schedule::command('packages:sync-remote')->everyThirtyMinutes();
Schedule::job(new CheckComplaintSlaJob)->everyFiveMinutes();
Schedule::command('dispatch:assign-pending')->everyTwoMinutes();
Schedule::command('dispatch:check-no-response')->everyMinute();
Schedule::command('phase2:lock-requirements')->everyFiveMinutes();
Schedule::command('bras:sync-sessions')->everyFiveMinutes();
Schedule::command('kpi:snapshot')->dailyAt('00:05');
