import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Shield, 
  Users, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { apiClient } from '../../lib/api';
import { Button } from '../ui/button';

interface RoleApiData {
  id: number;
  name: string;
  permissions: string[];
  user_count: number;
}

// Keep UI metadata for presentation (colors, labels, descriptions)
const ROLE_UI_META: Record<string, { label: string; description: string; color: string }> = {
  superadmin: {
    label: 'Superadmin',
    description: 'Akses penuh tanpa batasan untuk mengelola seluruh aspek sistem, pengguna staf, dan audit logs.',
    color: '#ef4444',
  },
  admin: {
    label: 'Admin Provisioning',
    description: 'Staf kantor yang memvalidasi pengajuan pelanggan, menyusun profil bandwidth NAS, dan membagikan tugas teknisi.',
    color: '#10b981',
  },
  sales: {
    label: 'Sales Agent',
    description: 'Staf pemasaran di lapangan yang mendaftarkan data pelanggan baru dan mengunggah berkas KTP/Rumah.',
    color: '#3b82f6',
  },
  teknisi: {
    label: 'Teknisi Lapangan',
    description: 'Instalatur fisik di rumah pelanggan yang melaporkan status perjalanan, pengerjaan, dan mengunggah foto modem.',
    color: '#f59e0b',
  },
};

export const RolesViewer: React.FC = () => {
  // Query actual roles and permissions from Spatie backend API
  const { data: roles, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: async () => {
      const response = await apiClient.get<{ data: RoleApiData[] }>('/superadmin/roles');
      return response.data || [];
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">
          Daftar Hak Akses & Peran Staf
        </h1>
        <p className="text-gray-500 dark:text-slate-400">
          Tinjauan spesifikasi izin middleware Spatie yang terpasang pada masing-masing peran pengguna.
        </p>
      </div>

      {/* Global Error Boundary */}
      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gagal Memuat Data Peran API</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 items-start mt-2">
            <p>{error instanceof Error ? error.message : 'Terjadi kesalahan saat memproses data dari backend.'}</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} className="flex flex-col">
              <CardHeader className="border-b">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-8 w-1/2" />
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-20 w-full mt-4" />
              </CardContent>
            </Card>
          ))
        ) : roles && roles.length > 0 ? (
          roles.map((role) => {
            const uiMeta = ROLE_UI_META[role.name.toLowerCase()] || {
              label: role.name,
              description: 'Peran khusus.',
              color: '#6b7280'
            };

            return (
              <Card key={role.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader className="border-b">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <Badge style={{ backgroundColor: `${uiMeta.color}20`, color: uiMeta.color }}>
                        {uiMeta.label}
                      </Badge>
                      <CardTitle className="text-lg text-gray-800 font-bold pt-1">
                        {uiMeta.label} Access Control
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-500 font-semibold bg-gray-50 border p-2 rounded-lg">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{role.user_count} Staf</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                      {uiMeta.description}
                    </p>
                    
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Kemampuan (Spatie Gates)
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {role.permissions && role.permissions.length > 0 ? (
                          role.permissions.map((perm) => (
                            <Badge
                              key={perm}
                              variant="outline"
                              className="font-mono text-xs border-gray-200 text-gray-700 bg-gray-50"
                            >
                              {perm}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">Tidak ada izin eksplisit.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-3 mt-4 flex items-center text-xs text-green-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Konfigurasi API Sinkron
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>Tidak ada peran yang ditemukan.</p>
          </div>
        )}
      </div>
    </div>
  );
};

