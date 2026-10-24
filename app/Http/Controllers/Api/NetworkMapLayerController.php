<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class NetworkMapLayerController extends Controller
{
    /**
     * Daftar lapisan peta dan ketentuan lisensi penyedia resmi.
     */
    public function index(): JsonResponse
    {
        $layers = [
            [
                'id' => 'street_osm',
                'name' => 'OpenStreetMap Standard',
                'type' => 'vector_or_raster',
                'url' => 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'attribution' => '&copy; OpenStreetMap contributors',
                'is_satellite' => false,
                'is_licensed' => false,
                'requires_terms_acceptance' => false,
            ],
            [
                'id' => 'satellite_esri',
                'name' => 'Citra Satelit Berlisensi (Esri World Imagery)',
                'type' => 'raster',
                'url' => 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                'attribution' => 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                'is_satellite' => true,
                'is_licensed' => true,
                'requires_terms_acceptance' => true,
                'provider' => 'Esri ArcGIS Online',
                'terms_of_use' => [
                    'summary' => 'Hanya untuk pemetaan operasional internal Fibermedia.',
                    'disclaimer' => 'Citra satelit ini disediakan oleh penyedia berlisensi untuk keperluan visualisasi dan verifikasi jalur telekomunikasi internal. Pengguna dilarang mendistribusikan ulang atau mengomersialkan tile data secara independen.',
                    'license_url' => 'https://www.esri.com/en-us/legal/terms/full-master-agreement',
                ],
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $layers,
        ]);
    }
}
