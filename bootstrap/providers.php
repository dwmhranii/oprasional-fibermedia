<?php

use App\Modules\Customer\Providers\CustomerServiceProvider;
use App\Providers\AppServiceProvider;
use App\Providers\HorizonServiceProvider;

return [
    AppServiceProvider::class,
    HorizonServiceProvider::class,
    CustomerServiceProvider::class,
];
