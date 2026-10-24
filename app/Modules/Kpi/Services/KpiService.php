<?php

namespace App\Modules\Kpi\Services;

use App\Models\Complaint;
use App\Models\DailyAttendance;
use App\Models\KpiSetting;
use App\Models\KpiSnapshot;
use App\Models\Media;
use App\Models\Submission;
use App\Models\Task;
use App\Models\Team;
use App\Models\TicketAttendance;
use App\Models\TicketEvent;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class KpiService
{
    /**
     * Input rating kepuasan pelanggan 1-5 dari WhatsApp oleh admin (Aturan 11 & Fase 5).
     *
     * @param  string  $ticketType  'psb'|'complaint'
     * @param  int  $rating  Skala 1 - 5
     * @return Task|Complaint
     */
    public function recordCustomerRating(string $ticketType, int $ticketId, int $rating, ?string $note, User $admin)
    {
        if ($rating < 1 || $rating > 5) {
            throw new InvalidArgumentException('Rating harus berada di antara 1 sampai 5.');
        }

        $ticket = $ticketType === 'psb'
            ? Task::findOrFail($ticketId)
            : Complaint::findOrFail($ticketId);

        $ticket->customer_rating = $rating;
        $ticket->rating_note = $note;
        $ticket->rated_at = now();
        $ticket->rated_by_id = $admin->id;
        $ticket->save();

        TicketEvent::record(
            ticket: $ticket,
            event: 'customer_rating_recorded',
            fromStatus: $ticket->status,
            toStatus: $ticket->status,
            payload: [
                'rating' => $rating,
                'note' => $note,
                'rated_by' => $admin->name,
            ],
            actorId: $admin->id
        );

        return $ticket;
    }

    /**
     * Buat tautan WhatsApp resmi untuk konfirmasi rating pelanggan (Fase 5 Item 4).
     */
    public function generateWhatsAppRatingLink(string $ticketType, int $ticketId): array
    {
        $ticket = $ticketType === 'psb'
            ? Task::with(['provisioning.submission.customer', 'provisioning.submission', 'assignedTeam'])->findOrFail($ticketId)
            : Complaint::with(['customer', 'assignedTeam'])->findOrFail($ticketId);

        $customerName = 'Pelanggan';
        $customerPhone = '';
        $ticketNumber = '';

        if ($ticketType === 'psb') {
            $ticketNumber = $ticket->task_number;
            $sub = $ticket->provisioning?->submission;
            $customerName = $sub?->customer_name ?? ($sub?->customer?->name ?? 'Pelanggan');
            $customerPhone = $sub?->phone ?? ($sub?->customer?->phone ?? '');
        } else {
            $ticketNumber = $ticket->ticket_number;
            $customerName = $ticket->customer?->name ?? $ticket->customer_name ?? 'Pelanggan';
            $customerPhone = $ticket->customer?->phone ?? $ticket->phone ?? '';
        }

        $cleanPhone = preg_replace('/\D+/', '', (string) $customerPhone);
        if (str_starts_with($cleanPhone, '0')) {
            $cleanPhone = '62'.substr($cleanPhone, 1);
        }

        $teamName = $ticket->assignedTeam?->name ?? 'Teknisi Fibermedia';
        $typeName = $ticketType === 'psb' ? 'Pemasangan Baru (PSB)' : 'Perbaikan Gangguan';

        $message = "Halo Bpk/Ibu {$customerName},\n\nTerima kasih telah mempercayakan layanan internet kepada Fibermedia. Pekerjaan {$typeName} dengan nomor tiket [{$ticketNumber}] telah diselesaikan oleh tim {$teamName}.\n\nMohon kesediaannya untuk memberikan penilaian kepuasan Anda (skala 1 - 5 bintang) beserta ulasan singkat dengan membalas pesan ini.\n\nRating Anda sangat berarti untuk peningkatan kualitas layanan kami. Terima kasih!";

        $encodedText = rawurlencode($message);
        $url = "https://wa.me/{$cleanPhone}?text={$encodedText}";

        return [
            'ticket_type' => $ticketType,
            'ticket_id' => $ticketId,
            'ticket_number' => $ticketNumber,
            'customer_name' => $customerName,
            'customer_phone' => $customerPhone,
            'clean_phone' => $cleanPhone,
            'message' => $message,
            'url' => $url,
        ];
    }

    /**
     * Hitung KPI Tim bulanan (Fase 5 Item 2).
     */
    public function computeTeamKpi(string $period, int $teamId, ?int $settingsVersion = null): array
    {
        $team = Team::findOrFail($teamId);
        $dates = $this->resolvePeriodDates($period);
        $startDate = $dates['start'];
        $endDate = $dates['end'];

        // Ambil pengaturan KPI Tim aktif (atau versi spesifik)
        $setting = $settingsVersion
            ? KpiSetting::where('category', 'team')->where('version', $settingsVersion)->first()
            : KpiSetting::getActive('team');

        $weights = $setting?->weights ?? [
            'sla_compliance' => 0.25,
            'acceptance_speed' => 0.15,
            'productivity' => 0.15,
            'evidence_quality' => 0.15,
            'customer_rating' => 0.15,
            'attendance' => 0.15,
        ];

        $targets = $setting?->targets ?? [
            'sla_target_percent' => 95.0,
            'acceptance_target_minutes' => 15.0,
            'monthly_tickets_target' => 30,
            'rating_target' => 4.5,
            'working_days_target' => 22,
            'max_repeat_trouble_percent' => 5.0,
        ];

        $isReadOnly = $setting ? $setting->isReadOnly($startDate) : false;

        // 1. Kecepatan Terima (Acceptance Speed)
        $acceptSpeedData = $this->calculateAcceptanceSpeed('team', $teamId, $startDate, $endDate);

        // 2. Waktu Selesai vs SLA (config/sla.php)
        $slaData = $this->calculateSlaCompliance('team', $teamId, $startDate, $endDate);

        // 3. Tiket Selesai (Productivity)
        $productivityData = $this->calculateProductivity('team', $teamId, $startDate, $endDate, (int) ($targets['monthly_tickets_target'] ?? 30));

        // 4. Tingkat Gangguan Berulang (Repeat Trouble Rate)
        $repeatTroubleData = $this->calculateRepeatTroubleRate('team', $teamId, $startDate, $endDate);

        // 5. Kelengkapan Bukti (Evidence Quality)
        $evidenceData = $this->calculateEvidenceCompleteness('team', $teamId, $startDate, $endDate);

        // 6. Jumlah Anomali (Anomalies Count)
        $anomalyData = $this->calculateAnomalies('team', $teamId, $startDate, $endDate);

        // 7. Kehadiran Tim: hadir/tidak saja (Aturan 11: jam masuk belum dihitung)
        $attendanceData = $this->calculateTeamAttendance($team, $startDate, $endDate, (int) ($targets['working_days_target'] ?? 22));

        // 8. Rating Pelanggan Rata-rata (1-5)
        $ratingData = $this->calculateCustomerRating('team', $teamId, $startDate, $endDate);

        // Perhitungan Skor Komposit (Skala 0 - 100)
        $slaScore = $slaData['compliance_rate'];
        $acceptScore = $acceptSpeedData['score'];
        $prodScore = $productivityData['score'];
        $evidenceScore = $evidenceData['score'];
        $ratingScore = ($ratingData['average_rating'] / 5.0) * 100.0;
        $attendanceScore = $attendanceData['attendance_rate'];

        // Penalti gangguan berulang dan anomali
        $repeatPenalty = min(15.0, $repeatTroubleData['repeat_trouble_rate'] * 0.5);
        $anomalyPenalty = min(15.0, $anomalyData['anomalies_count'] * 2.0);

        $weightedScore = (
            ($slaScore * ($weights['sla_compliance'] ?? 0.25)) +
            ($acceptScore * ($weights['acceptance_speed'] ?? 0.15)) +
            ($prodScore * ($weights['productivity'] ?? 0.15)) +
            ($evidenceScore * ($weights['evidence_quality'] ?? 0.15)) +
            ($ratingScore * ($weights['customer_rating'] ?? 0.15)) +
            ($attendanceScore * ($weights['attendance'] ?? 0.15))
        );

        $finalCompositeScore = max(0.0, min(100.0, round($weightedScore - $repeatPenalty - $anomalyPenalty, 2)));

        $metrics = [
            'acceptance_speed_minutes' => $acceptSpeedData['avg_minutes'],
            'acceptance_speed_score' => $acceptSpeedData['score'],
            'sla_compliance_rate' => $slaData['compliance_rate'],
            'total_breaches' => $slaData['total_breaches'],
            'on_time_tickets' => $slaData['on_time_count'],
            'completed_tickets' => $productivityData['total_completed'],
            'completed_tasks' => $productivityData['completed_tasks'],
            'resolved_complaints' => $productivityData['resolved_complaints'],
            'productivity_score' => $productivityData['score'],
            'repeat_trouble_count' => $repeatTroubleData['repeat_count'],
            'repeat_trouble_rate' => $repeatTroubleData['repeat_trouble_rate'],
            'evidence_completeness_rate' => $evidenceData['completeness_rate'],
            'anomalies_count' => $anomalyData['anomalies_count'],
            'attendance_rate' => $attendanceData['attendance_rate'],
            'present_days' => $attendanceData['present_days'],
            'target_working_days' => $attendanceData['target_days'],
            'average_rating' => $ratingData['average_rating'],
            'rated_tickets_count' => $ratingData['rated_count'],
            'repeat_penalty' => round($repeatPenalty, 2),
            'anomaly_penalty' => round($anomalyPenalty, 2),
        ];

        // Simpan ke snapshot basis data
        KpiSnapshot::updateOrCreate([
            'period' => $period,
            'subject_type' => 'team',
            'subject_id' => $teamId,
        ], [
            'metrics' => $metrics,
            'weights' => $weights,
            'score' => $finalCompositeScore,
            'settings_version' => $setting?->version ?? 1,
            'is_read_only' => $isReadOnly,
            'computed_at' => now(),
        ]);

        return [
            'period' => $period,
            'subject_type' => 'team',
            'subject_id' => $teamId,
            'subject_name' => $team->name,
            'settings_version' => $setting?->version ?? 1,
            'is_read_only' => $isReadOnly,
            'metrics' => $metrics,
            'weights' => $weights,
            'score' => $finalCompositeScore,
        ];
    }

    /**
     * Hitung KPI Individu Teknisi (Fase 5 Item 2).
     */
    public function computeTechnicianKpi(string $period, int $userId, ?int $settingsVersion = null): array
    {
        $user = User::findOrFail($userId);
        $dates = $this->resolvePeriodDates($period);
        $startDate = $dates['start'];
        $endDate = $dates['end'];

        $setting = $settingsVersion
            ? KpiSetting::where('category', 'technician')->where('version', $settingsVersion)->first()
            : KpiSetting::getActive('technician');

        $weights = $setting?->weights ?? [
            'sla_compliance' => 0.25,
            'acceptance_speed' => 0.15,
            'productivity' => 0.15,
            'evidence_quality' => 0.15,
            'customer_rating' => 0.15,
            'attendance' => 0.15,
        ];

        $targets = $setting?->targets ?? [
            'sla_target_percent' => 95.0,
            'acceptance_target_minutes' => 15.0,
            'monthly_tickets_target' => 15,
            'rating_target' => 4.5,
            'working_days_target' => 22,
        ];

        $isReadOnly = $setting ? $setting->isReadOnly($startDate) : false;

        $acceptSpeedData = $this->calculateAcceptanceSpeed('technician', $userId, $startDate, $endDate);
        $slaData = $this->calculateSlaCompliance('technician', $userId, $startDate, $endDate);
        $productivityData = $this->calculateProductivity('technician', $userId, $startDate, $endDate, (int) ($targets['monthly_tickets_target'] ?? 15));
        $repeatTroubleData = $this->calculateRepeatTroubleRate('technician', $userId, $startDate, $endDate);
        $evidenceData = $this->calculateEvidenceCompleteness('technician', $userId, $startDate, $endDate);
        $anomalyData = $this->calculateAnomalies('technician', $userId, $startDate, $endDate);
        $attendanceData = $this->calculateUserAttendance($userId, $startDate, $endDate, (int) ($targets['working_days_target'] ?? 22));
        $ratingData = $this->calculateCustomerRating('technician', $userId, $startDate, $endDate);

        $slaScore = $slaData['compliance_rate'];
        $acceptScore = $acceptSpeedData['score'];
        $prodScore = $productivityData['score'];
        $evidenceScore = $evidenceData['score'];
        $ratingScore = ($ratingData['average_rating'] / 5.0) * 100.0;
        $attendanceScore = $attendanceData['attendance_rate'];

        $repeatPenalty = min(15.0, $repeatTroubleData['repeat_trouble_rate'] * 0.5);
        $anomalyPenalty = min(15.0, $anomalyData['anomalies_count'] * 2.0);

        $weightedScore = (
            ($slaScore * ($weights['sla_compliance'] ?? 0.25)) +
            ($acceptScore * ($weights['acceptance_speed'] ?? 0.15)) +
            ($prodScore * ($weights['productivity'] ?? 0.15)) +
            ($evidenceScore * ($weights['evidence_quality'] ?? 0.15)) +
            ($ratingScore * ($weights['customer_rating'] ?? 0.15)) +
            ($attendanceScore * ($weights['attendance'] ?? 0.15))
        );

        $finalCompositeScore = max(0.0, min(100.0, round($weightedScore - $repeatPenalty - $anomalyPenalty, 2)));

        $metrics = [
            'acceptance_speed_minutes' => $acceptSpeedData['avg_minutes'],
            'acceptance_speed_score' => $acceptSpeedData['score'],
            'sla_compliance_rate' => $slaData['compliance_rate'],
            'total_breaches' => $slaData['total_breaches'],
            'on_time_tickets' => $slaData['on_time_count'],
            'completed_tickets' => $productivityData['total_completed'],
            'completed_tasks' => $productivityData['completed_tasks'],
            'resolved_complaints' => $productivityData['resolved_complaints'],
            'productivity_score' => $productivityData['score'],
            'repeat_trouble_count' => $repeatTroubleData['repeat_count'],
            'repeat_trouble_rate' => $repeatTroubleData['repeat_trouble_rate'],
            'evidence_completeness_rate' => $evidenceData['completeness_rate'],
            'anomalies_count' => $anomalyData['anomalies_count'],
            'attendance_rate' => $attendanceData['attendance_rate'],
            'present_days' => $attendanceData['present_days'],
            'target_working_days' => $attendanceData['target_days'],
            'average_rating' => $ratingData['average_rating'],
            'rated_tickets_count' => $ratingData['rated_count'],
            'repeat_penalty' => round($repeatPenalty, 2),
            'anomaly_penalty' => round($anomalyPenalty, 2),
        ];

        KpiSnapshot::updateOrCreate([
            'period' => $period,
            'subject_type' => 'technician',
            'subject_id' => $userId,
        ], [
            'metrics' => $metrics,
            'weights' => $weights,
            'score' => $finalCompositeScore,
            'settings_version' => $setting?->version ?? 1,
            'is_read_only' => $isReadOnly,
            'computed_at' => now(),
        ]);

        return [
            'period' => $period,
            'subject_type' => 'technician',
            'subject_id' => $userId,
            'subject_name' => $user->name,
            'settings_version' => $setting?->version ?? 1,
            'is_read_only' => $isReadOnly,
            'metrics' => $metrics,
            'weights' => $weights,
            'score' => $finalCompositeScore,
        ];
    }

    /**
     * Hitung KPI Sales (Fase 5 Item 3: Kehadiran 10%, Tanpa Komisi).
     */
    public function computeSalesKpi(string $period, int $salesUserId, ?int $settingsVersion = null): array
    {
        $salesUser = User::findOrFail($salesUserId);
        $dates = $this->resolvePeriodDates($period);
        $startDate = $dates['start'];
        $endDate = $dates['end'];

        $setting = $settingsVersion
            ? KpiSetting::where('category', 'sales')->where('version', $settingsVersion)->first()
            : KpiSetting::getActive('sales');

        $weights = $setting?->weights ?? [
            'validation_rate' => 0.30,
            'installation_rate' => 0.30,
            'data_quality' => 0.30,
            'attendance' => 0.10, // Tepat 10% sesuai Aturan 3 & 11
        ];

        $targets = $setting?->targets ?? [
            'monthly_submissions_target' => 10,
            'validation_target_percent' => 80.0,
            'installation_target_percent' => 70.0,
            'clean_data_target_percent' => 95.0,
            'working_days_target' => 22,
        ];

        $isReadOnly = $setting ? $setting->isReadOnly($startDate) : false;

        // 1. Pengajuan masuk
        $totalSubmissions = Submission::where(function ($q) use ($salesUserId) {
            $q->where('sales_id', $salesUserId)
                ->orWhere('user_id', $salesUserId);
        })
            ->whereBetween('created_at', [$startDate, $endDate])
            ->count();

        // 2. Tervalidasi (approved atau completed)
        $approvedSubmissions = Submission::where(function ($q) use ($salesUserId) {
            $q->where('sales_id', $salesUserId)
                ->orWhere('user_id', $salesUserId);
        })
            ->whereBetween('created_at', [$startDate, $endDate])
            ->whereIn('status', ['approved', 'completed'])
            ->count();

        $validationRate = $totalSubmissions > 0
            ? round(($approvedSubmissions / $totalSubmissions) * 100.0, 2)
            : 0.0;

        // 3. Jadi terpasang (status completed)
        $installedSubmissions = Submission::where(function ($q) use ($salesUserId) {
            $q->where('sales_id', $salesUserId)
                ->orWhere('user_id', $salesUserId);
        })
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('status', 'completed')
            ->count();

        $installationRate = $totalSubmissions > 0
            ? round(($installedSubmissions / $totalSubmissions) * 100.0, 2)
            : 0.0;

        // 4. Kualitas data (tanpa duplikat)
        $cleanSubmissions = Submission::where(function ($q) use ($salesUserId) {
            $q->where('sales_id', $salesUserId)
                ->orWhere('user_id', $salesUserId);
        })
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereNull('duplicate_warnings')
                    ->orWhere('duplicate_warnings', '[]')
                    ->orWhere('duplicate_warnings', '');
            })
            ->count();

        $dataQualityRate = $totalSubmissions > 0
            ? round(($cleanSubmissions / $totalSubmissions) * 100.0, 2)
            : 100.0;

        // 5. Kehadiran 10% (hadir/tidak saja)
        $attendanceData = $this->calculateUserAttendance($salesUserId, $startDate, $endDate, (int) ($targets['working_days_target'] ?? 22));
        $attendanceRate = $attendanceData['attendance_rate'];

        // Skor Komposit Sales (Bobot: Validasi 30%, Terpasang 30%, Kualitas Data 30%, Kehadiran 10%)
        // Tanpa Komisi!
        $compositeScore = round(
            ($validationRate * ($weights['validation_rate'] ?? 0.30)) +
            ($installationRate * ($weights['installation_rate'] ?? 0.30)) +
            ($dataQualityRate * ($weights['data_quality'] ?? 0.30)) +
            ($attendanceRate * ($weights['attendance'] ?? 0.10)),
            2
        );

        $metrics = [
            'total_submissions' => $totalSubmissions,
            'approved_submissions' => $approvedSubmissions,
            'validation_rate' => $validationRate,
            'installed_submissions' => $installedSubmissions,
            'completed_submissions' => $installedSubmissions,
            'installation_rate' => $installationRate,
            'clean_submissions' => $cleanSubmissions,
            'duplicate_submissions' => max(0, $totalSubmissions - $cleanSubmissions),
            'data_quality_rate' => $dataQualityRate,
            'attendance_rate' => $attendanceRate,
            'present_days' => $attendanceData['present_days'],
            'target_working_days' => $attendanceData['target_days'],
        ];

        KpiSnapshot::updateOrCreate([
            'period' => $period,
            'subject_type' => 'sales',
            'subject_id' => $salesUserId,
        ], [
            'metrics' => $metrics,
            'weights' => $weights,
            'score' => $compositeScore,
            'settings_version' => $setting?->version ?? 1,
            'is_read_only' => $isReadOnly,
            'computed_at' => now(),
        ]);

        return [
            'period' => $period,
            'subject_type' => 'sales',
            'subject_id' => $salesUserId,
            'subject_name' => $salesUser->name,
            'settings_version' => $setting?->version ?? 1,
            'is_read_only' => $isReadOnly,
            'metrics' => $metrics,
            'weights' => $weights,
            'score' => $compositeScore,
        ];
    }

    /**
     * Hitung dan simpan snapshot semua tim, teknisi, dan sales aktif (Fase 5 Item 1 command kpi:snapshot).
     */
    public function snapshotAll(string $period): array
    {
        $results = [
            'period' => $period,
            'teams' => [],
            'technicians' => [],
            'sales' => [],
        ];

        // 1. Tim
        $teams = Team::where('is_active', true)->get();
        foreach ($teams as $team) {
            $results['teams'][] = $this->computeTeamKpi($period, $team->id);
        }

        // 2. Teknisi
        $technicians = User::role('Teknisi')->get();
        foreach ($technicians as $tech) {
            $results['technicians'][] = $this->computeTechnicianKpi($period, $tech->id);
        }

        // 3. Sales
        $salesList = User::role('Sales')->get();
        foreach ($salesList as $sales) {
            $results['sales'][] = $this->computeSalesKpi($period, $sales->id);
        }

        return $results;
    }

    /**
     * Dapatkan rekap bulanan untuk Dasbor Admin.
     */
    public function getMonthlyOverview(string $period): array
    {
        $teamSnapshots = KpiSnapshot::where('period', $period)
            ->where('subject_type', 'team')
            ->get()
            ->map(function ($snap) {
                return [
                    'id' => $snap->id,
                    'subject_id' => $snap->subject_id,
                    'name' => Team::find($snap->subject_id)?->name ?? "Tim #{$snap->subject_id}",
                    'score' => (float) $snap->score,
                    'metrics' => $snap->metrics,
                    'is_read_only' => $snap->is_read_only,
                    'settings_version' => $snap->settings_version,
                ];
            });

        $techSnapshots = KpiSnapshot::where('period', $period)
            ->where('subject_type', 'technician')
            ->get()
            ->map(function ($snap) {
                return [
                    'id' => $snap->id,
                    'subject_id' => $snap->subject_id,
                    'name' => User::find($snap->subject_id)?->name ?? "Teknisi #{$snap->subject_id}",
                    'score' => (float) $snap->score,
                    'metrics' => $snap->metrics,
                    'is_read_only' => $snap->is_read_only,
                    'settings_version' => $snap->settings_version,
                ];
            });

        $salesSnapshots = KpiSnapshot::where('period', $period)
            ->where('subject_type', 'sales')
            ->get()
            ->map(function ($snap) {
                return [
                    'id' => $snap->id,
                    'subject_id' => $snap->subject_id,
                    'name' => User::find($snap->subject_id)?->name ?? "Sales #{$snap->subject_id}",
                    'score' => (float) $snap->score,
                    'metrics' => $snap->metrics,
                    'is_read_only' => $snap->is_read_only,
                    'settings_version' => $snap->settings_version,
                ];
            });

        $teamSetting = KpiSetting::getActive('team');

        return [
            'period' => $period,
            'is_read_only' => $teamSetting ? $teamSetting->isReadOnly(Carbon::createFromFormat('Y-m', $period)->startOfMonth()) : false,
            'read_only_until' => $teamSetting?->read_only_until?->toDateString(),
            'teams' => $teamSnapshots,
            'technicians' => $techSnapshots,
            'sales' => $salesSnapshots,
        ];
    }

    /**
     * Ekspor Laporan Bulanan dalam format CSV untuk Excel (Fase 5 Item 5).
     */
    public function exportCsv(string $period): string
    {
        $overview = $this->getMonthlyOverview($period);
        $fp = fopen('php://temp', 'r+');

        // BOM untuk kompatibilitas UTF-8 di Microsoft Excel
        fwrite($fp, "\xEF\xBB\xBF");

        // Header Laporan
        fputcsv($fp, ['LAPORAN KINERJA & KPI BULANAN - FIBERMEDIA OPERASIONAL']);
        fputcsv($fp, ['Periode', $period]);
        fputcsv($fp, ['Status Penilaian', $overview['is_read_only'] ? 'Mode Hanya-Lihat / Uji Coba (Belum Mengikat)' : 'Penilaian Resmi']);
        fputcsv($fp, ['Dicetak Pada', now()->format('Y-m-d H:i:s')]);
        fputcsv($fp, []);

        // 1. REKAP KPI TIM
        fputcsv($fp, ['=== KPI TIM LAPANGAN ===']);
        fputcsv($fp, [
            'Nama Tim',
            'Skor Akhir',
            'SLA Compliance (%)',
            'Kecepatan Terima (Menit)',
            'Tiket Selesai',
            'Kelengkapan Bukti (%)',
            'Rating Rata-rata',
            'Kehadiran (%)',
            'Gangguan Berulang (%)',
            'Anomali',
            'Versi Pengaturan',
            'Status',
        ]);

        foreach ($overview['teams'] as $t) {
            $m = $t['metrics'] ?? [];
            fputcsv($fp, [
                $t['name'],
                number_format($t['score'], 2),
                number_format($m['sla_compliance_rate'] ?? 0, 2).'%',
                number_format($m['acceptance_speed_minutes'] ?? 0, 1),
                $m['completed_tickets'] ?? 0,
                number_format($m['evidence_completeness_rate'] ?? 0, 2).'%',
                number_format($m['average_rating'] ?? 5, 2),
                number_format($m['attendance_rate'] ?? 0, 2).'%',
                number_format($m['repeat_trouble_rate'] ?? 0, 2).'%',
                $m['anomalies_count'] ?? 0,
                'v'.($t['settings_version'] ?? 1),
                $t['is_read_only'] ? 'Uji Coba' : 'Resmi',
            ]);
        }

        fputcsv($fp, []);

        // 2. REKAP KPI SALES
        fputcsv($fp, ['=== KPI SALES (TANPA KOMISI) ===']);
        fputcsv($fp, [
            'Nama Sales',
            'Skor Akhir',
            'Pengajuan Masuk',
            'Tervalidasi',
            'Tingkat Validasi (%)',
            'Jadi Terpasang',
            'Tingkat Terpasang (%)',
            'Kualitas Data Bersih (%)',
            'Kehadiran 10% (%)',
            'Komisi',
            'Versi Pengaturan',
            'Status',
        ]);

        foreach ($overview['sales'] as $s) {
            $m = $s['metrics'] ?? [];
            fputcsv($fp, [
                $s['name'],
                number_format($s['score'], 2),
                $m['total_submissions'] ?? 0,
                $m['approved_submissions'] ?? 0,
                number_format($m['validation_rate'] ?? 0, 2).'%',
                $m['installed_submissions'] ?? 0,
                number_format($m['installation_rate'] ?? 0, 2).'%',
                number_format($m['data_quality_rate'] ?? 0, 2).'%',
                number_format($m['attendance_rate'] ?? 0, 2).'%',
                'Rp 0 (Tanpa Komisi)',
                'v'.($s['settings_version'] ?? 1),
                $s['is_read_only'] ? 'Uji Coba' : 'Resmi',
            ]);
        }

        rewind($fp);
        $csv = stream_get_contents($fp);
        fclose($fp);

        return $csv;
    }

    // ==========================================
    // METRIK INTERNAL CALCULATIONS
    // ==========================================

    protected function resolvePeriodDates(string $period): array
    {
        $start = Carbon::createFromFormat('Y-m', $period)->startOfMonth();
        $end = Carbon::createFromFormat('Y-m', $period)->endOfMonth();

        return ['start' => $start, 'end' => $end];
    }

    /**
     * Hitung rata-rata kecepatan terima tiket (dalam menit) dan skornya.
     */
    protected function calculateAcceptanceSpeed(string $type, int $subjectId, Carbon $start, Carbon $end): array
    {
        $delays = [];

        // Ambil tiket yang di-assign pada periode
        if ($type === 'team') {
            $tasks = Task::where('assigned_team_id', $subjectId)
                ->whereBetween('assigned_at', [$start, $end])
                ->get();

            $complaints = Complaint::where('assigned_team_id', $subjectId)
                ->whereBetween('assigned_at', [$start, $end])
                ->get();
        } else {
            $tasks = Task::where('teknisi_id', $subjectId)
                ->whereBetween('assigned_at', [$start, $end])
                ->get();

            $complaints = Complaint::where('teknisi_id', $subjectId)
                ->whereBetween('assigned_at', [$start, $end])
                ->get();
        }

        foreach ($tasks as $task) {
            if ($task->assigned_at && $task->accepted_at) {
                $assigned = Carbon::parse($task->assigned_at);
                $accepted = Carbon::parse($task->accepted_at);
                $delays[] = abs($accepted->diffInMinutes($assigned));
            } elseif ($task->assigned_at && $task->status === 'assigned') {
                // Belum di-accept
                $delays[] = 15.0;
            }
        }

        foreach ($complaints as $c) {
            $cStatus = $c->status instanceof \BackedEnum ? $c->status->value : $c->status;
            if ($c->assigned_at && $c->accepted_at) {
                $assigned = Carbon::parse($c->assigned_at);
                $accepted = Carbon::parse($c->accepted_at);
                $delays[] = abs($accepted->diffInMinutes($assigned));
            } elseif ($c->assigned_at && $cStatus === 'assigned') {
                $delays[] = 15.0;
            }
        }

        if (empty($delays)) {
            return ['avg_minutes' => 0.0, 'score' => 100.0];
        }

        $avg = round(array_sum($delays) / count($delays), 2);
        // Target <= 15 menit. Jika avg <= 15 -> 100%. Lebih dari 15, berkurang 5 poin per menit.
        $score = $avg <= 15.0 ? 100.0 : max(0.0, round(100.0 - (($avg - 15.0) * 5.0), 2));

        return ['avg_minutes' => $avg, 'score' => $score];
    }

    /**
     * Hitung kepatuhan SLA (config/sla.php).
     */
    protected function calculateSlaCompliance(string $type, int $subjectId, Carbon $start, Carbon $end): array
    {
        $slaConfig = config('sla.hours', [
            'critical' => 2,
            'high' => 4,
            'medium' => 12,
            'low' => 24,
        ]);

        if ($type === 'team') {
            $tasks = Task::where('assigned_team_id', $subjectId)
                ->where('status', 'completed')
                ->whereBetween('completed_at', [$start, $end])
                ->get();

            $complaints = Complaint::where('assigned_team_id', $subjectId)
                ->whereIn('status', ['resolved', 'closed'])
                ->whereBetween('resolved_at', [$start, $end])
                ->get();
        } else {
            $tasks = Task::where('teknisi_id', $subjectId)
                ->where('status', 'completed')
                ->whereBetween('completed_at', [$start, $end])
                ->get();

            $complaints = Complaint::where('teknisi_id', $subjectId)
                ->whereIn('status', ['resolved', 'closed'])
                ->whereBetween('resolved_at', [$start, $end])
                ->get();
        }

        $totalCompleted = $tasks->count() + $complaints->count();
        if ($totalCompleted === 0) {
            return ['compliance_rate' => 100.0, 'total_breaches' => 0, 'on_time_count' => 0];
        }

        $onTimeCount = 0;
        $breachCount = 0;

        foreach ($tasks as $task) {
            $startTime = Carbon::parse($task->assigned_at ?? $task->created_at);
            $endTime = Carbon::parse($task->completed_at ?? now());
            $durationHours = abs($endTime->diffInHours($startTime));
            // Default PSB target SLA 24 jam
            if ($durationHours <= 24) {
                $onTimeCount++;
            } else {
                $breachCount++;
            }
        }

        foreach ($complaints as $c) {
            $startTime = Carbon::parse($c->assigned_at ?? $c->created_at);
            $endTime = Carbon::parse($c->resolved_at ?? now());
            $durationHours = abs($endTime->diffInHours($startTime));
            $priorityVal = $c->priority instanceof \BackedEnum ? $c->priority->value : ($c->priority ?? 'medium');
            $targetHours = $slaConfig[$priorityVal] ?? 12;

            if ($durationHours <= $targetHours) {
                $onTimeCount++;
            } else {
                $breachCount++;
            }
        }

        $complianceRate = round(($onTimeCount / $totalCompleted) * 100.0, 2);

        return [
            'compliance_rate' => $complianceRate,
            'total_breaches' => $breachCount,
            'on_time_count' => $onTimeCount,
        ];
    }

    /**
     * Hitung produktivitas tiket selesai vs target.
     */
    protected function calculateProductivity(string $type, int $subjectId, Carbon $start, Carbon $end, int $target): array
    {
        if ($type === 'team') {
            $completedTasks = Task::where('assigned_team_id', $subjectId)
                ->where('status', 'completed')
                ->whereBetween('completed_at', [$start, $end])
                ->count();

            $resolvedComplaints = Complaint::where('assigned_team_id', $subjectId)
                ->whereIn('status', ['resolved', 'closed'])
                ->whereBetween('resolved_at', [$start, $end])
                ->count();
        } else {
            $completedTasks = Task::where('teknisi_id', $subjectId)
                ->where('status', 'completed')
                ->whereBetween('completed_at', [$start, $end])
                ->count();

            $resolvedComplaints = Complaint::where('teknisi_id', $subjectId)
                ->whereIn('status', ['resolved', 'closed'])
                ->whereBetween('resolved_at', [$start, $end])
                ->count();
        }

        $totalCompleted = $completedTasks + $resolvedComplaints;
        $score = $target > 0 ? min(100.0, round(($totalCompleted / $target) * 100.0, 2)) : 100.0;

        return [
            'completed_tasks' => $completedTasks,
            'resolved_complaints' => $resolvedComplaints,
            'total_completed' => $totalCompleted,
            'score' => $score,
        ];
    }

    /**
     * Hitung tingkat gangguan berulang (Repeat Trouble Rate dalam 30 hari).
     */
    protected function calculateRepeatTroubleRate(string $type, int $subjectId, Carbon $start, Carbon $end): array
    {
        $complaints = $type === 'team'
            ? Complaint::where('assigned_team_id', $subjectId)
                ->whereIn('status', ['resolved', 'closed'])
                ->whereBetween('resolved_at', [$start, $end])
                ->get()
            : Complaint::where('teknisi_id', $subjectId)
                ->whereIn('status', ['resolved', 'closed'])
                ->whereBetween('resolved_at', [$start, $end])
                ->get();

        $total = $complaints->count();
        if ($total === 0) {
            return ['repeat_count' => 0, 'repeat_trouble_rate' => 0.0];
        }

        $repeatCount = 0;
        foreach ($complaints as $c) {
            if (! $c->customer_id) {
                continue;
            }

            // Cek apakah pelanggan yang sama ada komplain lain dalam kurun 30 hari sebelum komplain ini
            $hasPrevious = Complaint::where('customer_id', $c->customer_id)
                ->where('id', '!=', $c->id)
                ->where('created_at', '<', $c->created_at)
                ->where('created_at', '>=', $c->created_at->copy()->subDays(30))
                ->exists();

            if ($hasPrevious) {
                $repeatCount++;
            }
        }

        $rate = round(($repeatCount / $total) * 100.0, 2);

        return ['repeat_count' => $repeatCount, 'repeat_trouble_rate' => $rate];
    }

    /**
     * Hitung kelengkapan bukti (Fase 1 + Fase 2).
     */
    protected function calculateEvidenceCompleteness(string $type, int $subjectId, Carbon $start, Carbon $end): array
    {
        if ($type === 'team') {
            $tasks = Task::with(['phase2Requirements', 'ticketAttendances'])
                ->where('assigned_team_id', $subjectId)
                ->where('status', 'completed')
                ->whereBetween('completed_at', [$start, $end])
                ->get();

            $complaints = Complaint::with(['phase2Requirements', 'ticketAttendances', 'evidence', 'media'])
                ->where('assigned_team_id', $subjectId)
                ->whereIn('status', ['resolved', 'closed'])
                ->whereBetween('resolved_at', [$start, $end])
                ->get();
        } else {
            $tasks = Task::with(['phase2Requirements', 'ticketAttendances'])
                ->where('teknisi_id', $subjectId)
                ->where('status', 'completed')
                ->whereBetween('completed_at', [$start, $end])
                ->get();

            $complaints = Complaint::with(['phase2Requirements', 'ticketAttendances', 'evidence', 'media'])
                ->where('teknisi_id', $subjectId)
                ->whereIn('status', ['resolved', 'closed'])
                ->whereBetween('resolved_at', [$start, $end])
                ->get();
        }

        $total = $tasks->count() + $complaints->count();
        if ($total === 0) {
            return ['complete_count' => 0, 'completeness_rate' => 100.0, 'score' => 100.0];
        }

        $completeCount = 0;

        foreach ($tasks as $task) {
            // Task lengkap bila ada tanda tangan atau foto, dan Fase 2 terpenuhi
            $hasSigOrPhotos = ! empty($task->customer_signature_path) || ! empty($task->photos);
            $phase2Met = $task->phase2Requirements->isEmpty() || $task->phase2Requirements->every(fn ($r) => $r->is_fulfilled || $r->exempted_by);

            if ($hasSigOrPhotos && $phase2Met) {
                $completeCount++;
            }
        }

        foreach ($complaints as $c) {
            $hasEvidence = $c->evidence !== null || $c->media->isNotEmpty() || ! empty($c->status_reason) || ! empty($c->verified_notes);
            $phase2Met = $c->phase2Requirements->isEmpty() || $c->phase2Requirements->every(fn ($r) => $r->is_fulfilled || $r->exempted_by);

            if ($hasEvidence && $phase2Met) {
                $completeCount++;
            }
        }

        $rate = round(($completeCount / $total) * 100.0, 2);

        return [
            'complete_count' => $completeCount,
            'completeness_rate' => $rate,
            'score' => $rate,
        ];
    }

    /**
     * Hitung jumlah anomali (selisih foto > 2 jam, lokasi di luar geofence / low_accuracy).
     */
    protected function calculateAnomalies(string $type, int $subjectId, Carbon $start, Carbon $end): array
    {
        $taskIds = $type === 'team'
            ? Task::where('assigned_team_id', $subjectId)->whereBetween('created_at', [$start, $end])->pluck('id')
            : Task::where('teknisi_id', $subjectId)->whereBetween('created_at', [$start, $end])->pluck('id');

        $complaintIds = $type === 'team'
            ? Complaint::where('assigned_team_id', $subjectId)->whereBetween('created_at', [$start, $end])->pluck('id')
            : Complaint::where('teknisi_id', $subjectId)->whereBetween('created_at', [$start, $end])->pluck('id');

        // 1. Anomali geofence absensi tiket (outside / low_accuracy)
        $geoAnomalies = TicketAttendance::where(function ($q) use ($taskIds, $complaintIds) {
            $q->where(function ($sq) use ($taskIds) {
                $sq->where('attendable_type', 'App\Models\Task')->whereIn('attendable_id', $taskIds);
            })->orWhere(function ($sq) use ($complaintIds) {
                $sq->where('attendable_type', 'App\Models\Complaint')->whereIn('attendable_id', $complaintIds);
            });
        })
            ->whereIn('geofence_status', ['outside', 'low_accuracy'])
            ->count();

        // 2. Anomali selisih waktu upload foto > 2 jam (7200 detik)
        $driver = DB::connection()->getDriverName();
        $mediaQuery = Media::whereBetween('created_at', [$start, $end])
            ->whereNotNull('captured_at')
            ->whereNotNull('received_at');

        if ($driver === 'sqlite') {
            $mediaQuery->whereRaw('ABS(strftime("%s", received_at) - strftime("%s", captured_at)) > 7200');
        } elseif ($driver === 'pgsql') {
            $mediaQuery->whereRaw('ABS(EXTRACT(EPOCH FROM (received_at - captured_at))) > 7200');
        } else {
            $mediaQuery->whereRaw('ABS(TIMESTAMPDIFF(SECOND, captured_at, received_at)) > 7200');
        }

        $timeAnomalies = $mediaQuery->count();

        $totalAnomalies = $geoAnomalies + $timeAnomalies;

        return ['anomalies_count' => $totalAnomalies];
    }

    /**
     * Hitung kehadiran tim.
     */
    protected function calculateTeamAttendance(Team $team, Carbon $start, Carbon $end, int $targetWorkingDays): array
    {
        $memberUserIds = $team->members()->pluck('user_id')->toArray();
        if (empty($memberUserIds)) {
            return ['attendance_rate' => 100.0, 'present_days' => 0, 'target_days' => $targetWorkingDays];
        }

        $presentCount = DailyAttendance::whereIn('user_id', $memberUserIds)
            ->whereBetween('work_date', [$start->toDateString(), $end->toDateString()])
            ->where('status', 'hadir')
            ->whereNotNull('check_in_at')
            ->count();

        $totalExpectedDays = $targetWorkingDays * count($memberUserIds);
        $rate = $totalExpectedDays > 0
            ? min(100.0, round(($presentCount / $totalExpectedDays) * 100.0, 2))
            : 100.0;

        return [
            'attendance_rate' => $rate,
            'present_days' => $presentCount,
            'target_days' => $totalExpectedDays,
        ];
    }

    /**
     * Hitung kehadiran individu (Sales / Teknisi).
     */
    protected function calculateUserAttendance(int $userId, Carbon $start, Carbon $end, int $targetWorkingDays): array
    {
        $presentDays = DailyAttendance::where('user_id', $userId)
            ->whereBetween('work_date', [$start->toDateString(), $end->toDateString()])
            ->where('status', 'hadir')
            ->whereNotNull('check_in_at')
            ->count();

        $rate = $targetWorkingDays > 0
            ? min(100.0, round(($presentDays / $targetWorkingDays) * 100.0, 2))
            : 100.0;

        return [
            'attendance_rate' => $rate,
            'present_days' => $presentDays,
            'target_days' => $targetWorkingDays,
        ];
    }

    /**
     * Hitung rata-rata rating kepuasan pelanggan (1 - 5).
     */
    protected function calculateCustomerRating(string $type, int $subjectId, Carbon $start, Carbon $end): array
    {
        if ($type === 'team') {
            $taskRatings = Task::where('assigned_team_id', $subjectId)
                ->whereBetween('completed_at', [$start, $end])
                ->whereNotNull('customer_rating')
                ->pluck('customer_rating');

            $complaintRatings = Complaint::where('assigned_team_id', $subjectId)
                ->whereBetween('resolved_at', [$start, $end])
                ->whereNotNull('customer_rating')
                ->pluck('customer_rating');
        } else {
            $taskRatings = Task::where('teknisi_id', $subjectId)
                ->whereBetween('completed_at', [$start, $end])
                ->whereNotNull('customer_rating')
                ->pluck('customer_rating');

            $complaintRatings = Complaint::where('teknisi_id', $subjectId)
                ->whereBetween('resolved_at', [$start, $end])
                ->whereNotNull('customer_rating')
                ->pluck('customer_rating');
        }

        $all = $taskRatings->concat($complaintRatings);
        if ($all->isEmpty()) {
            return ['average_rating' => 5.0, 'rated_count' => 0];
        }

        $avg = round($all->average(), 2);

        return ['average_rating' => $avg, 'rated_count' => $all->count()];
    }
}
