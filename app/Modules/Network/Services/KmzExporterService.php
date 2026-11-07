<?php

namespace App\Modules\Network\Services;

use App\Models\Customer;
use App\Models\NetworkCable;
use App\Models\Odc;
use App\Models\Odp;
use App\Models\Olt;
use Illuminate\Support\Facades\File;
use ZipArchive;

class KmzExporterService
{
    /**
     * Ekspor seluruh data simpul dan jalur jaringan ke berkas KMZ.
     */
    public function export(): string
    {
        $olts = Olt::all();
        $odcs = Odc::all();
        $odps = Odp::all();
        $cables = NetworkCable::all();
        $customers = Customer::whereNotNull('latitude')->whereNotNull('longitude')->get();

        $kml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $kml .= '<kml xmlns="http://www.opengis.net/kml/2.2">'."\n";
        $kml .= "<Document>\n";
        $kml .= "  <name>Fibermedia Network Export</name>\n";
        $kml .= '  <description>Diekspor dari sistem Fibermedia-Ops pada '.now()->format('d-m-Y H:i:s')." WIB.</description>\n";
        $kml .= "  <open>1</open>\n";

        // Folder Server / OLT
        $kml .= '  <Folder><name>Server / OLT ('.count($olts).")</name>\n";
        foreach ($olts as $olt) {
            $kml .= "    <Placemark>\n";
            $kml .= '      <name>'.htmlspecialchars($olt->name)."</name>\n";
            $kml .= "      <ExtendedData>\n";
            $kml .= '        <Data name="Tipe"><value>Server / OLT</value></Data>'."\n";
            $kml .= '        <Data name="Kode"><value>'.htmlspecialchars($olt->code)."</value></Data>\n";
            $kml .= '        <Data name="Status"><value>'.ucfirst($olt->status ?? 'Normal')."</value></Data>\n";
            $kml .= '        <Data name="Alamat"><value>'.htmlspecialchars($olt->address ?? '')."</value></Data>\n";
            $kml .= "      </ExtendedData>\n";
            $kml .= "      <Point>\n";
            $kml .= "        <altitudeMode>clampToGround</altitudeMode>\n";
            $kml .= "        <coordinates>{$olt->longitude},{$olt->latitude},0</coordinates>\n";
            $kml .= "      </Point>\n";
            $kml .= "    </Placemark>\n";
        }
        $kml .= "  </Folder>\n";

        // Folder ODC
        $kml .= '  <Folder><name>ODC ('.count($odcs).")</name>\n";
        foreach ($odcs as $odc) {
            $statusLabel = $odc->status === 'disrupted' ? 'Terindikasi Gangguan' : ucfirst($odc->status ?? 'Normal');
            $kml .= "    <Placemark>\n";
            $kml .= '      <name>'.htmlspecialchars($odc->name)."</name>\n";
            $kml .= "      <ExtendedData>\n";
            $kml .= '        <Data name="Tipe"><value>ODC</value></Data>'."\n";
            $kml .= '        <Data name="Kode"><value>'.htmlspecialchars($odc->code)."</value></Data>\n";
            $kml .= '        <Data name="Status"><value>'.$statusLabel."</value></Data>\n";
            $kml .= '        <Data name="Jumlah ODP"><value>'.$odc->capacity_odp."</value></Data>\n";
            $kml .= '        <Data name="Alamat"><value>'.htmlspecialchars($odc->address ?? '')."</value></Data>\n";
            $kml .= '        <Data name="Keterangan"><value>'.htmlspecialchars($odc->notes ?? '')."</value></Data>\n";
            $kml .= "      </ExtendedData>\n";
            $kml .= "      <Point>\n";
            $kml .= "        <altitudeMode>clampToGround</altitudeMode>\n";
            $kml .= "        <coordinates>{$odc->longitude},{$odc->latitude},0</coordinates>\n";
            $kml .= "      </Point>\n";
            $kml .= "    </Placemark>\n";
        }
        $kml .= "  </Folder>\n";

        // Folder ODP
        $kml .= '  <Folder><name>ODP ('.count($odps).")</name>\n";
        foreach ($odps as $odp) {
            $statusLabel = ucfirst($odp->status ?? 'Normal');
            $kml .= "    <Placemark>\n";
            $kml .= '      <name>'.htmlspecialchars($odp->name)."</name>\n";
            $kml .= "      <ExtendedData>\n";
            $kml .= '        <Data name="Tipe"><value>ODP</value></Data>'."\n";
            $kml .= '        <Data name="Kode"><value>'.htmlspecialchars($odp->code)."</value></Data>\n";
            $kml .= '        <Data name="Status"><value>'.$statusLabel."</value></Data>\n";
            $kml .= '        <Data name="Jumlah Port"><value>'.$odp->port_capacity."</value></Data>\n";
            $kml .= '        <Data name="Alamat"><value>'.htmlspecialchars($odp->address ?? '')."</value></Data>\n";
            $kml .= '        <Data name="Keterangan"><value>'.htmlspecialchars($odp->notes ?? '')."</value></Data>\n";
            $kml .= "      </ExtendedData>\n";
            $kml .= "      <Point>\n";
            $kml .= "        <altitudeMode>clampToGround</altitudeMode>\n";
            $kml .= "        <coordinates>{$odp->longitude},{$odp->latitude},0</coordinates>\n";
            $kml .= "      </Point>\n";
            $kml .= "    </Placemark>\n";
        }
        $kml .= "  </Folder>\n";

        // Folder Client
        $kml .= '  <Folder><name>Client ('.count($customers).")</name>\n";
        foreach ($customers as $c) {
            $username = $c->username ?: $c->customer_code;
            $kml .= "    <Placemark>\n";
            $kml .= '      <name>'.htmlspecialchars($username)."</name>\n";
            $kml .= "      <ExtendedData>\n";
            $kml .= '        <Data name="Tipe"><value>Client</value></Data>'."\n";
            $kml .= '        <Data name="Nama"><value>'.htmlspecialchars($c->name)."</value></Data>\n";
            $kml .= '        <Data name="Alamat"><value>'.htmlspecialchars($c->address ?? '')."</value></Data>\n";
            $kml .= "      </ExtendedData>\n";
            $kml .= "      <Point>\n";
            $kml .= "        <altitudeMode>clampToGround</altitudeMode>\n";
            $kml .= "        <coordinates>{$c->longitude},{$c->latitude},0</coordinates>\n";
            $kml .= "      </Point>\n";
            $kml .= "    </Placemark>\n";
        }
        $kml .= "  </Folder>\n";

        // Folder Kabel / Jalur
        $cablesOltOdc = $cables->where('kind', 'olt_odc');
        $cablesOdcOdp = $cables->where('kind', 'odc_odp');
        $cablesOdpCust = $cables->where('kind', 'odp_customer');

        $kml .= "  <Folder><name>Kabel / Jalur</name>\n";

        $appendCableFolder = function ($title, $cableList) use (&$kml) {
            $kml .= '    <Folder><name>'.$title.' ('.count($cableList).")</name>\n";
            foreach ($cableList as $cable) {
                $statusLabel = $cable->status === 'cut' ? 'Terindikasi Putus' : ucfirst($cable->status ?? 'Normal');
                $kml .= "      <Placemark>\n";
                $kml .= '        <name>'.htmlspecialchars($cable->name)."</name>\n";
                $kml .= "        <ExtendedData>\n";
                $kml .= '          <Data name="Jenis"><value>'.$title."</value></Data>\n";
                $kml .= '          <Data name="Dari"><value>'.htmlspecialchars($cable->from_name ?? '')."</value></Data>\n";
                $kml .= '          <Data name="Ke"><value>'.htmlspecialchars($cable->to_name ?? '')."</value></Data>\n";
                $kml .= '          <Data name="Backbone"><value>'.($cable->is_backbone ? 'Ya' : 'Tidak')."</value></Data>\n";
                $kml .= '          <Data name="Status"><value>'.$statusLabel."</value></Data>\n";
                $kml .= '          <Data name="Panjang Kabel"><value>'.$cable->length_m." m (garis lurus)</value></Data>\n";
                $kml .= "        </ExtendedData>\n";
                $kml .= "        <LineString>\n";
                $kml .= "          <tessellate>1</tessellate>\n";
                $kml .= "          <altitudeMode>clampToGround</altitudeMode>\n";

                $coordsStr = '';
                if (is_array($cable->route)) {
                    $pts = [];
                    foreach ($cable->route as $pt) {
                        if (is_array($pt) && count($pt) >= 2) {
                            $pts[] = "{$pt[0]},{$pt[1]},0";
                        }
                    }
                    $coordsStr = implode(' ', $pts);
                }
                $kml .= "          <coordinates>{$coordsStr}</coordinates>\n";
                $kml .= "        </LineString>\n";
                $kml .= "      </Placemark>\n";
            }
            $kml .= "    </Folder>\n";
        };

        $appendCableFolder('Kabel Server/ODC ke ODC', $cablesOltOdc);
        $appendCableFolder('Kabel ODC ke ODP', $cablesOdcOdp);
        $appendCableFolder('Kabel ODP ke Client', $cablesOdpCust);

        $kml .= "  </Folder>\n"; // End Kabel / Jalur
        $kml .= "</Document>\n";
        $kml .= "</kml>\n";

        // Simpan ke ZIP KMZ
        $exportDir = storage_path('app/exports');
        if (! file_exists($exportDir)) {
            File::makeDirectory($exportDir, 0755, true);
        }

        $kmzFilename = 'network_export_'.date('Ymd_His').'.kmz';
        $kmzPath = $exportDir.DIRECTORY_SEPARATOR.$kmzFilename;

        $zip = new ZipArchive;
        if ($zip->open($kmzPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
            $zip->addFromString('doc.kml', $kml);
            $zip->close();

            return $kmzPath;
        }

        throw new \RuntimeException("Gagal membuat arsip KMZ di {$kmzPath}");
    }
}
