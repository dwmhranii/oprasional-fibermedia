<?php

namespace App\Observers;

use Illuminate\Support\Facades\Cache;

class AnalyticsCacheObserver
{
    public function saved($model)
    {
        $this->invalidateCache();
    }

    public function deleted($model)
    {
        $this->invalidateCache();
    }

    protected function invalidateCache()
    {
        Cache::increment('analytics_cache_version');
    }
}
