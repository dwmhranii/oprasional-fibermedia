<?php

namespace App\Enums;

enum ResolutionCategory: string
{
    case CABLE_BROKEN = 'cable_broken';
    case ONT_FAULTY = 'ont_faulty';
    case ONT_RESET = 'ont_reset';
    case SPLITTER_ODP_ISSUE = 'splitter_odp_issue';
    case CONFIG_ISSUE = 'config_issue';
    case CUSTOMER_SIDE = 'customer_side';
    case BILLING_RESOLVED = 'billing_resolved';
    case OTHER = 'other';
}
