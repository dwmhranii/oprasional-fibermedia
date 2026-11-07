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
  History,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  User,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDateTime } from '@shared/lib/formatters';

interface ActivityLogItem {
  id: number;
  log_name?: string;
  description: string;
  event?: string;
  subject_type?: string;
  subject_id?: number;
  causer?: {
    id: number;
    name: string;
    email: string;
  };
  properties?: {
    role?: string;
    added?: string[];
    revoked?: string[];
    old_role?: string;
    new_role?: string;
    reset_to_default?: boolean;
    [key: string]: any;
  };
  created_at: string;
}

export const AccessHistoryTab: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ['access-history-logs', page, search],
    queryFn: async () => {
      const res = await apiClient.get<any>('/activity-logs', {
        params: {
          page,
          log_name: 'access_control',
          search: search || undefined,
        },
      });
      return res?.data || res;
    },
  });

  const logs: ActivityLogItem[] = Array.isArray(responseData?.data)
    ? responseData.data
    : Array.isArray(responseData)
    ? responseData
    : [];

  const pagination = responseData?.meta || responseData;
  const lastPage = pagination?.last_page || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Riwayat Perubahan Hak Akses</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Jejak audit seluruh perubahan wewenang role, reset hak akses, dan pergantian role pengguna.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
        <Input
          placeholder="Cari dalam riwayat aktivitas hak akses..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-9 bg-card border-border text-foreground text-sm"
        />
      </div>

      {/* Table Card */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <History className="w-4 h-4 text-primary" />
            <span>Log Perubahan Wewenang & Role</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Data dicatat secara otomatis oleh sistem saat Superadmin melakukan tindakan wewenang.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40">
                  <TableHead className="font-semibold text-xs text-muted-foreground">Waktu (WIB)</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Eksekutor (Causer)</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Aktivitas</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Rincian Perubahan (Diff)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Memuat jejak riwayat...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      Belum ada riwayat aktivitas hak akses yang tercatat.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const props = log.properties || {};
                    const added = props.added || [];
                    const revoked = props.revoked || [];

                    return (
                      <TableRow key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap py-3.5">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{formatDateTime(log.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-3.5">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <span>{log.causer?.name || 'Sistem Otomatis'}</span>
                          </div>
                          {log.causer?.email && (
                            <span className="text-[11px] text-muted-foreground block">
                              {log.causer.email}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium py-3.5 max-w-sm">
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{log.description}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="space-y-1 max-w-md">
                            {props.old_role && props.new_role && (
                              <div className="text-xs text-foreground">
                                Peran:{' '}
                                <Badge variant="outline" className="text-[10px] px-1 py-0 mr-1">
                                  {props.old_role}
                                </Badge>
                                &rarr;
                                <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 text-primary border-primary/30">
                                  {props.new_role}
                                </Badge>
                              </div>
                            )}

                            {props.reset_to_default && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                                Reset ke Nilai Bawaan
                              </Badge>
                            )}

                            {added.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  +{added.length} ditambah:
                                </span>
                                {added.slice(0, 3).map((p) => (
                                  <span
                                    key={p}
                                    className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  >
                                    +{p}
                                  </span>
                                ))}
                                {added.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{added.length - 3} lainnya
                                  </span>
                                )}
                              </div>
                            )}

                            {revoked.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                  -{revoked.length} dicabut:
                                </span>
                                {revoked.slice(0, 3).map((p) => (
                                  <span
                                    key={p}
                                    className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                  >
                                    -{p}
                                  </span>
                                ))}
                                {revoked.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    -{revoked.length - 3} lainnya
                                  </span>
                                )}
                              </div>
                            )}

                            {!props.old_role && added.length === 0 && revoked.length === 0 && (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Halaman {page} dari {lastPage}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={page >= lastPage}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
