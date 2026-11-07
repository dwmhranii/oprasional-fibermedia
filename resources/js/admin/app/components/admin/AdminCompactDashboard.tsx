import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileCheck, AlertTriangle, UserPlus, Send, Smartphone } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { PageHeader } from '@shared/ui/PageHeader';
import { StatCards, StatItem } from '@shared/ui/StatCards';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';

export const AdminCompactDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Ambil badge count untuk submissions pending
  const { data: badgesData, isLoading: badgesLoading } = useQuery<{ success: boolean; data: Record<string, number> }>({
    queryKey: ['menuBadges'],
    queryFn: async () => {
      return await apiClient.get('/menu/badges');
    },
    staleTime: 30000,
  });

  // Ambil total pengaduan yang diajukan oleh user ini
  const { data: complaintsData, isLoading: complaintsLoading } = useQuery<{ success: boolean; meta?: { total?: number }; data?: any[] }>({
    queryKey: ['adminMyComplaintsCount'],
    queryFn: async () => {
      return await apiClient.get('/complaints?per_page=1');
    },
    staleTime: 30000,
  });

  const badgesPayload = (badgesData as any)?.pending_submissions !== undefined ? (badgesData as any) : badgesData?.data;
  const pendingSubmissionsCount = badgesPayload?.pending_submissions ?? 0;
  const myComplaintsCount = complaintsData?.meta?.total ?? (Array.isArray(complaintsData?.data) ? complaintsData.data.length : 0);

  const statItems: StatItem[] = [
    {
      id: 'pending-submissions',
      title: 'Pengajuan Menunggu Persetujuan',
      value: pendingSubmissionsCount,
      subtitle: 'Pengajuan PSB dari Sales siap ditinjau',
      icon: FileCheck,
      variant: pendingSubmissionsCount > 0 ? 'warning' : 'neutral',
      onClick: () => navigate('/admin/submissions?status=pending'),
    },
    {
      id: 'my-complaints',
      title: 'Pengaduan Yang Saya Ajukan',
      value: myComplaintsCount,
      subtitle: 'Tiket pengaduan aktif yang Anda buat',
      icon: AlertTriangle,
      variant: 'info',
      onClick: () => navigate('/admin/complaints'),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Admin"
        description="Pusat layanan pelanggan, verifikasi pengajuan PSB, dan pengajuan tiket kendala."
      />

      {/* Pemberitahuan Absen PWA */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-foreground">
        <Smartphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Absensi Harian Dibuka Lewat PWA</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Untuk melakukan absensi masuk dan pulang kerja, silakan buka aplikasi PWA Fibermedia di ponsel Anda.
          </p>
        </div>
      </div>

      {/* Ringkasan Status Tindakan */}
      <StatCards
        items={statItems}
        columns={2}
        isLoading={badgesLoading || complaintsLoading}
      />

      {/* Jalan Pintas Tindakan Operasional */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">Jalan Pintas Operasional</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Aksi cepat untuk melayani kebutuhan pelanggan baru maupun pengaduan pelanggan aktif.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-start gap-2 text-left border-border hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/admin/customers?action=create')}
          >
            <div className="flex items-center gap-2 font-medium text-foreground">
              <UserPlus className="w-4 h-4 text-primary" />
              <span>Tambah Pelanggan</span>
            </div>
            <p className="text-xs text-muted-foreground font-normal">
              Daftarkan data pelanggan baru langsung ke dalam sistem operasional.
            </p>
          </Button>

          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-start gap-2 text-left border-border hover:bg-muted/50 transition-colors"
            onClick={() => navigate('/admin/complaints/new')}
          >
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Send className="w-4 h-4 text-amber-500" />
              <span>Ajukan Pengaduan</span>
            </div>
            <p className="text-xs text-muted-foreground font-normal">
              Buat tiket laporan kendala koneksi atau teknis yang dialami pelanggan.
            </p>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCompactDashboard;
