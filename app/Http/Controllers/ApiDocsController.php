<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;

class ApiDocsController extends Controller
{
    /**
     * Render the API Documentation as an interactive web page.
     */
    public function index()
    {
        $docPath = base_path('docs/API_DOCUMENTATION.md');
        $markdownContent = File::exists($docPath) ? File::get($docPath) : '# API Documentation Not Found';

        return view('docs.api', [
            'markdownContent' => $markdownContent,
            'title' => 'Fibermedia API Documentation v2.1 (Frozen)',
        ]);
    }

    /**
     * Render the API Freeze policy document as a web page.
     */
    public function freeze()
    {
        $freezePath = base_path('docs/API_FREEZE.md');
        $markdownContent = File::exists($freezePath) ? File::get($freezePath) : '# API Freeze Document Not Found';

        return view('docs.api', [
            'markdownContent' => $markdownContent,
            'title' => 'Fibermedia API Freeze Specification v2.1',
        ]);
    }

    /**
     * Return raw API Documentation Markdown as JSON for external tools/frontend.
     */
    public function rawJson(): JsonResponse
    {
        $docPath = base_path('docs/API_DOCUMENTATION.md');
        $freezePath = base_path('docs/API_FREEZE.md');

        return response()->json([
            'success' => true,
            'version' => '2.1',
            'status' => 'FROZEN',
            'documentation' => File::exists($docPath) ? File::get($docPath) : null,
            'freeze_policy' => File::exists($freezePath) ? File::get($freezePath) : null,
        ]);
    }
}
