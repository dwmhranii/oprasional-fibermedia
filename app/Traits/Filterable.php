<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait Filterable
{
    /**
     * Apply common search, date filters, and sorting.
     */
    public function scopeFilterAndSort(Builder $query, Request $request, array $searchableColumns = []): Builder
    {
        // 1. Search
        if ($request->filled('search') && ! empty($searchableColumns)) {
            $search = $request->input('search');
            $query->where(function (Builder $q) use ($search, $searchableColumns) {
                foreach ($searchableColumns as $column) {
                    if (str_contains($column, '.')) {
                        // Relation search e.g., 'submission.customer_name'
                        [$relation, $relationColumn] = explode('.', $column, 2);
                        $q->orWhereHas($relation, function (Builder $sq) use ($relationColumn, $search) {
                            // If relation column still has dot (nested relation) we handle 1 level for now
                            $sq->where($relationColumn, 'like', "%{$search}%");
                        });
                    } else {
                        $q->orWhere($this->getTable().'.'.$column, 'like', "%{$search}%");
                    }
                }
            });
        }

        // 2. Date Filters
        if ($request->filled('date_from')) {
            $query->whereDate($this->getTable().'.created_at', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate($this->getTable().'.created_at', '<=', $request->input('date_to'));
        }

        // 3. Sorting
        if ($request->filled('sort_by')) {
            $sortBy = $request->input('sort_by');
            $sortOrder = strtolower($request->input('sort_order') ?? 'asc') === 'asc' ? 'asc' : 'desc';

            // Sort only if it's a direct column (no relations)
            if (! str_contains($sortBy, '.')) {
                $query->orderBy($this->getTable().'.'.$sortBy, $sortOrder);
            }
        } else {
            // Default sort
            $query->latest($this->getTable().'.created_at');
        }

        return $query;
    }
}
