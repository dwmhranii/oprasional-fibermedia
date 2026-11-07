import React, { useState } from 'react';
import {
  AttendanceReviewCard,
  FilterBar,
  Badge,
  Button,
} from '@shared/ui';
import { UserCheck, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AttendanceItem {
  id: string;
  userName: string;
  userRole: string;
  avatarUrl?: string;
  workDate: string;
  clockInTime: string;
  distanceMeters: number;
  isInsideRadius: boolean;
  gpsAccuracyMeters: number;
  photoUrl: string;
}

export const AdminAttendanceReviewScreen: React.FC = () => {
  const [roleFilter, setRoleFilter] = useState('all');
  const [radiusFilter, setRadiusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [attendances, setAttendances] = useState<AttendanceItem[]>([
    {
      id: 'att-1',
      userName: 'Ahmad Fauzi',
      userRole: 'Teknisi Lapangan (Tim Alpha)',
      workDate: '31 Okt 2026',
      clockInTime: '07:58 WIB',
      distanceMeters: 18,
      isInsideRadius: true,
      gpsAccuracyMeters: 4.1,
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'att-2',
      userName: 'Rudi Hartono',
      userRole: 'Teknisi Lapangan (Tim Bravo)',
      workDate: '31 Okt 2026',
      clockInTime: '08:05 WIB',
      distanceMeters: 35,
      isInsideRadius: true,
      gpsAccuracyMeters: 5.5,
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'att-3',
      userName: 'Indra Gunawan',
      userRole: 'Sales Lapangan (Retail)',
      workDate: '31 Okt 2026',
      clockInTime: '08:22 WIB',
      distanceMeters: 1450,
      isInsideRadius: false, // Di luar radius
      gpsAccuracyMeters: 12.0,
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'att-4',
      userName: 'Bambang Wijaya',
      userRole: 'Kolektor Tagihan Lapangan',
      workDate: '31 Okt 2026',
      clockInTime: '08:30 WIB',
      distanceMeters: 42,
      isInsideRadius: true,
      gpsAccuracyMeters: 3.8,
      photoUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
    },
  ]);

  const handleApprove = (id: string | number) => {
    setAttendances((prev) => prev.filter((item) => item.id !== String(id)));
  };

  const handleReject = (id: string | number) => {
    setAttendances((prev) => prev.filter((item) => item.id !== String(id)));
  };

  const handleApproveAllValid = () => {
    setAttendances((prev) => prev.filter((item) => !item.isInsideRadius));
  };

  const filtered = attendances.filter((item) => {
    const matchesSearch =
      item.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.userRole.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'teknisi' && item.userRole.toLowerCase().includes('teknisi')) ||
      (roleFilter === 'sales' && item.userRole.toLowerCase().includes('sales')) ||
      (roleFilter === 'kolektor' && item.userRole.toLowerCase().includes('kolektor'));

    const matchesRadius =
      radiusFilter === 'all' ||
      (radiusFilter === 'inside' && item.isInsideRadius) ||
      (radiusFilter === 'outside' && !item.isInsideRadius);

    return matchesSearch && matchesRole && matchesRadius;
  });

  const insideRadiusCount = attendances.filter((a) => a.isInsideRadius).length;
  const outsideRadiusCount = attendances.filter((a) => !a.isInsideRadius).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Antrean Tinjauan Absensi Lapangan
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Validasi koordinat GPS geofence kantor dan swafoto kehadiran harian teknisi, sales, serta kolektor.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="success" size="md">
            {insideRadiusCount} Di dalam radius
          </Badge>
          {outsideRadiusCount > 0 && (
            <Badge tone="danger" size="md">
              {outsideRadiusCount} Di luar radius
            </Badge>
          )}

          {insideRadiusCount > 0 && (
            <Button
              variant="primary"
              size="sm"
              density="compact"
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={handleApproveAllValid}
            >
              Setujui Semua yang Sah
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Cari nama staf atau peran..."
        filters={[
          {
            id: 'role',
            value: roleFilter,
            onChange: setRoleFilter,
            placeholder: 'Semua Peran',
            options: [
              { value: 'all', label: 'Semua Peran Staf' },
              { value: 'teknisi', label: 'Teknisi' },
              { value: 'sales', label: 'Sales' },
              { value: 'kolektor', label: 'Kolektor' },
            ],
          },
          {
            id: 'radius',
            value: radiusFilter,
            onChange: setRadiusFilter,
            placeholder: 'Semua Radius',
            options: [
              { value: 'all', label: 'Semua Status Geofence' },
              { value: 'inside', label: 'Di dalam radius' },
              { value: 'outside', label: 'Di luar radius' },
            ],
          },
        ]}
        onReset={() => {
          setSearchQuery('');
          setRoleFilter('all');
          setRadiusFilter('all');
        }}
        density="compact"
      />

      {/* Attendance Review Cards Grid */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border bg-card/60 text-center">
          <UserCheck className="w-10 h-10 text-primary mx-auto mb-2 opacity-60" />
          <h3 className="text-base font-semibold text-foreground">Semua Absensi Telah Ditinjau</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Tidak ada pengajuan absensi masuk staf yang menunggu persetujuan saat ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((att) => (
            <AttendanceReviewCard
              key={att.id}
              id={att.id}
              userName={att.userName}
              userRole={att.userRole}
              workDate={att.workDate}
              clockInTime={att.clockInTime}
              distanceMeters={att.distanceMeters}
              isInsideRadius={att.isInsideRadius}
              gpsAccuracyMeters={att.gpsAccuracyMeters}
              photoUrl={att.photoUrl}
              density="compact"
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
};

