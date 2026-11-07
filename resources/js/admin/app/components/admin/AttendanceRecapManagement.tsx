import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar, Download, RefreshCw, Users, FileSpreadsheet, Filter } from 'lucide-react';
import { toast } from 'sonner';

interface PersonRecap {
  user_id: number;
  name: string;
  email: string;
  team_id: number | null;
  team_name: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  work_days: number;
  attendance_rate: number;
}

interface TeamRecap {
  team_id: number;
  team_name: string;
  total_members: number;
  total_hadir: number;
  total_work_days: number;
  attendance_rate: number;
}

interface RecapResponseData {
  month: string;
  total_days: number;
  people: PersonRecap[];
  teams: TeamRecap[];
}

export const AttendanceRecapManagement: React.FC = () => {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // 1. Fetch Teams for filter
  const { data: teamsData } = useQuery<any>({
    queryKey: ['teams', 'list'],
    queryFn: async () => {
      const res = await apiClient.get('/teams');
      return res?.data || res || [];
    },
  });

  // 2. Fetch Monthly Recap Data
  const { data, isLoading, refetch, isRefetching } = useQuery<{ success: boolean; data: RecapResponseData }>({
    queryKey: ['attendanceRecap', selectedMonth, selectedTeam],
    queryFn: async () => {
      let url = `/attendances/recap?month=${selectedMonth}`;
      if (selectedTeam !== 'all') {
        url += `&team_id=${selectedTeam}`;
      }
      return await apiClient.get(url);
    },
  });

  const handleExportExcel = () => {
    let url = `/api/attendances/recap/export?month=${selectedMonth}`;
    if (selectedTeam !== 'all') {
      url += `&team_id=${selectedTeam}`;
    }
    toast.info('Mengunduh file Excel rekap absensi...');
    window.location.href = url;
  };

  const recapData: RecapResponseData | undefined =
    (data as any)?.summary !== undefined
      ? (data as unknown as RecapResponseData)
      : (data as any)?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Rekap Absensi Bulanan
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Laporan agregat kehadiran per individu dan tim operasional (periode {selectedMonth}).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Segarkan
          </Button>
          <Button
            size="sm"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Ekspor Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium">Bulan:</span>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-44 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium">Tim:</span>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger className="w-48 h-9 text-sm">
                <SelectValue placeholder="Semua Tim" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tim</SelectItem>
                {Array.isArray(teamsData) &&
                  teamsData.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ringkasan Per Tim */}
      {recapData?.teams && recapData.teams.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recapData.teams.map((t) => (
            <Card key={t.team_id} className="border-slate-200 dark:border-slate-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {t.team_name}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      t.attendance_rate >= 80
                        ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/40'
                    }
                  >
                    {t.attendance_rate}%
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div>Anggota: <strong>{t.total_members}</strong> orang</div>
                  <div>Total Kehadiran: <strong>{t.total_hadir}</strong> / {t.total_work_days} shift</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabel Rekap Per Karyawan */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Tabel Rekap Kehadiran Individu
          </CardTitle>
          <CardDescription>
            Rincian kehadiran, izin, sakit, dan alpa selama bulan {selectedMonth}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Karyawan</TableHead>
                  <TableHead>Tim</TableHead>
                  <TableHead className="text-center">Hadir</TableHead>
                  <TableHead className="text-center">Izin</TableHead>
                  <TableHead className="text-center">Sakit</TableHead>
                  <TableHead className="text-center">Alpa</TableHead>
                  <TableHead className="text-center">Total Hari Kerja</TableHead>
                  <TableHead className="text-right">Persentase Kehadiran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Memuat rekap absensi...
                    </TableCell>
                  </TableRow>
                ) : !recapData?.people || recapData.people.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      Tidak ada data kehadiran untuk filter yang dipilih.
                    </TableCell>
                  </TableRow>
                ) : (
                  recapData.people.map((person) => (
                    <TableRow key={person.user_id}>
                      <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                        {person.name}
                        <div className="text-xs text-slate-400">{person.email}</div>
                      </TableCell>
                      <TableCell>{person.team_name}</TableCell>
                      <TableCell className="text-center text-emerald-600 font-semibold">
                        {person.hadir}
                      </TableCell>
                      <TableCell className="text-center text-blue-600">
                        {person.izin}
                      </TableCell>
                      <TableCell className="text-center text-amber-600">
                        {person.sakit}
                      </TableCell>
                      <TableCell className="text-center text-rose-600 font-semibold">
                        {person.alpa}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {person.work_days}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            person.attendance_rate >= 80
                              ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                              : 'text-rose-700 border-rose-300 bg-rose-50 dark:bg-rose-950/40'
                          }
                        >
                          {person.attendance_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
