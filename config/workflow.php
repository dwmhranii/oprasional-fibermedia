<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Team Workflow Refactor Cutoff
    |--------------------------------------------------------------------------
    |
    | This timestamp represents the moment the Team-Based Workflow refactor
    | was deployed to production. Tasks created before this date will fallback
    | to legacy data storage locations (e.g., TaskCompletionEvidence) for shared
    | verification items.
    |
    */

    'legacy_cutoff' => env('WORKFLOW_LEGACY_CUTOFF', '2026-06-26 15:00:00'),

];
