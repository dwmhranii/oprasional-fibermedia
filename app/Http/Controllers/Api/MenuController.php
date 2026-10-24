<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MenuService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    protected MenuService $menuService;

    public function __construct(MenuService $menuService)
    {
        $this->menuService = $menuService;
    }

    /**
     * GET /api/menu
     * Mengembalikan pohon menu yang sudah difilter menurut izin pengguna.
     */
    public function menu(Request $request): JsonResponse
    {
        $tree = $this->menuService->getMenuTree($request->user());

        return response()->json([
            'success' => true,
            'data' => $tree,
        ]);
    }

    /**
     * GET /api/menu/badges
     * Mengembalikan angka badge yang di-cache beberapa detik dan aman dari kebocoran izin.
     */
    public function badges(Request $request): JsonResponse
    {
        $badges = $this->menuService->getBadges($request->user());

        return response()->json([
            'success' => true,
            'data' => $badges,
        ]);
    }
}
