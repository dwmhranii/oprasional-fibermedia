<?php

namespace App\Providers;

use App\Events\ProvisioningCompleted;
use App\Events\SubmissionApproved;
use App\Events\SubmissionRejected;
use App\Events\TaskCompleted;
use App\Listeners\SlaResolutionSubscriber;
use App\Models\Provisioning;
use App\Models\SlaBreach;
use App\Models\Submission;
use App\Models\Task;
use App\Observers\AnalyticsCacheObserver;
use Carbon\Carbon;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        if ($this->app->environment('local')) {
            $this->app->register(\Laravel\Telescope\TelescopeServiceProvider::class);
            $this->app->register(TelescopeServiceProvider::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Standardize all serialized Carbon datetime values to WIB (Asia/Jakarta, UTC+7).
        // This applies globally to every Eloquent model cast, notification payload,
        // and raw model JSON serialization — without altering database storage (UTC).
        Carbon::serializeUsing(function (Carbon $carbon) {
            return $carbon->setTimezone('Asia/Jakarta')->toIso8601String();
        });

        // Superadmin bypass: Superadmin has access to ALL permissions and abilities unconditionally
        \Illuminate\Support\Facades\Gate::before(function ($user, $ability) {
            return ($user->hasRole('Superadmin') || $user->hasRole('superadmin')) ? true : null;
        });

        \Illuminate\Support\Facades\Gate::define('submissions.view_any_or_own', function ($user) {
            return $user->can('submissions.view') || $user->can('submissions.view_own');
        });

        \Illuminate\Support\Facades\Gate::define('complaints.view_any_or_own', function ($user) {
            return $user->can('complaints.view') || $user->can('complaints.view_own');
        });

        Event::listen(
            SubmissionApproved::class,
            [SlaResolutionSubscriber::class, 'handleSubmissionResolved']
        );
        Event::listen(
            SubmissionRejected::class,
            [SlaResolutionSubscriber::class, 'handleSubmissionResolved']
        );
        Event::listen(
            ProvisioningCompleted::class,
            [SlaResolutionSubscriber::class, 'handleProvisioningResolved']
        );
        Event::listen(
            TaskCompleted::class,
            [SlaResolutionSubscriber::class, 'handleTaskResolved']
        );

        Submission::observe(AnalyticsCacheObserver::class);
        Provisioning::observe(AnalyticsCacheObserver::class);
        Task::observe(AnalyticsCacheObserver::class);
        SlaBreach::observe(AnalyticsCacheObserver::class);

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('services.frontend.url', 'http://localhost:5173')."/reset-password?token={$token}&email={$notifiable->getEmailForPasswordReset()}";
        });
    }
}
