<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PromoCode;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PromoCodeController extends Controller
{
    /**
     * Get list of all promo codes with stats summary
     */
    public function index(Request $request)
    {
        $query = PromoCode::with('creator:id,name,email')->orderBy('created_at', 'desc');

        if ($request->has('status') && in_array($request->status, ['active', 'inactive'])) {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && ! empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('code', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $promos = $query->get();

        $now = Carbon::now();
        $totalActive = PromoCode::where('status', 'active')->count();
        $totalUsed = PromoCode::sum('used_count');
        $totalExpired = PromoCode::where('valid_until', '<', $now)->count();

        return response()->json([
            'status' => 'success',
            'data' => $promos,
            'summary' => [
                'total_promos' => count($promos),
                'total_active' => $totalActive,
                'total_used' => $totalUsed,
                'total_expired' => $totalExpired,
            ],
        ]);
    }

    /**
     * Store new promo code or auto-generate
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:promo_codes,code',
            'description' => 'nullable|string',
            'type' => 'required|in:fixed,percentage,free_installation',
            'value' => 'required_if:type,fixed,percentage|numeric|min:0',
            'min_package_price' => 'nullable|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date|after_or_equal:valid_from',
            'status' => 'nullable|in:active,inactive',
        ]);

        $code = ! empty($validated['code'])
            ? strtoupper(trim($validated['code']))
            : 'FIBER-'.strtoupper(Str::random(6));

        $promo = PromoCode::create([
            'code' => $code,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'type' => $validated['type'],
            'value' => $validated['value'] ?? ($validated['type'] === 'free_installation' ? 50000 : 0),
            'min_package_price' => $validated['min_package_price'] ?? 0,
            'max_uses' => $validated['max_uses'] ?? null,
            'used_count' => 0,
            'valid_from' => $validated['valid_from'] ?? null,
            'valid_until' => $validated['valid_until'] ?? null,
            'status' => $validated['status'] ?? 'active',
            'created_by' => auth()->id(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Kode promo berhasil dibuat',
            'data' => $promo,
        ], 201);
    }

    /**
     * Show single promo code
     */
    public function show($id)
    {
        $promo = PromoCode::with('creator:id,name,email')->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $promo,
        ]);
    }

    /**
     * Update promo code
     */
    public function update(Request $request, $id)
    {
        $promo = PromoCode::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:promo_codes,code,'.$id,
            'description' => 'nullable|string',
            'type' => 'required|in:fixed,percentage,free_installation',
            'value' => 'required_if:type,fixed,percentage|numeric|min:0',
            'min_package_price' => 'nullable|numeric|min:0',
            'max_uses' => 'nullable|integer|min:1',
            'valid_from' => 'nullable|date',
            'valid_until' => 'nullable|date|after_or_equal:valid_from',
            'status' => 'required|in:active,inactive',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));

        $promo->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Kode promo berhasil diperbarui',
            'data' => $promo,
        ]);
    }

    /**
     * Toggle status active/inactive
     */
    public function toggleStatus($id)
    {
        $promo = PromoCode::findOrFail($id);
        $newStatus = $promo->status === 'active' ? 'inactive' : 'active';
        $promo->update(['status' => $newStatus]);

        return response()->json([
            'status' => 'success',
            'message' => 'Kode promo berhasil di-'.($newStatus === 'active' ? 'aktifkan' : 'nonaktifkan'),
            'data' => $promo,
        ]);
    }

    /**
     * Delete promo code
     */
    public function destroy($id)
    {
        $promo = PromoCode::findOrFail($id);
        $promo->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Kode promo berhasil dihapus',
        ]);
    }

    /**
     * Validate promo code (Used by Sales Form)
     */
    public function validateCode(Request $request)
    {
        $request->validate([
            'code' => 'required|string',
            'package_price' => 'nullable|numeric|min:0',
            'installation_fee' => 'nullable|numeric|min:0',
        ]);

        $codeStr = strtoupper(trim($request->code));
        $packagePrice = (float) ($request->package_price ?? 0);
        $installFee = (float) ($request->installation_fee ?? 50000);

        $promo = PromoCode::where('code', $codeStr)->first();

        if (! $promo) {
            return response()->json([
                'status' => 'error',
                'is_valid' => false,
                'message' => 'Kode promo tidak ditemukan atau tidak valid',
            ], 404);
        }

        $check = $promo->isValidFor($packagePrice);

        if (! $check['valid']) {
            return response()->json([
                'status' => 'error',
                'is_valid' => false,
                'message' => $check['message'],
            ], 422);
        }

        $discountAmount = $promo->calculateDiscount($packagePrice, $installFee);
        $finalTotal = max(0, ($packagePrice + $installFee) - $discountAmount);

        $discountText = match ($promo->type) {
            'fixed' => 'Potongan Rp '.number_format($promo->value, 0, ',', '.'),
            'percentage' => "Diskon {$promo->value}% (Rp ".number_format($discountAmount, 0, ',', '.').')',
            'free_installation' => 'Gratis Biaya Instalasi (Rp 50.000)',
            default => 'Diskon Rp '.number_format($discountAmount, 0, ',', '.'),
        };

        return response()->json([
            'status' => 'success',
            'is_valid' => true,
            'message' => "Kode promo '{$promo->code}' berhasil dipasang! {$discountText}",
            'discount_amount' => $discountAmount,
            'discount_text' => $discountText,
            'final_total' => $finalTotal,
            'promo' => [
                'id' => $promo->id,
                'code' => $promo->code,
                'name' => $promo->name,
                'type' => $promo->type,
                'value' => $promo->value,
            ],
        ]);
    }
}
