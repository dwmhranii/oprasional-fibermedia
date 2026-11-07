import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Shield,
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Users,
  Copy,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface RoleItem {
  id: number;
  name: string;
  description?: string;
  user_count: number;
  permissions?: string[];
  is_system?: boolean;
  is_core_role?: boolean;
}

interface RoleManagementTabProps {
  onSelectMatrixRole?: (roleId: number) => void;
}

export const RoleManagementTab: React.FC<RoleManagementTabProps> = ({ onSelectMatrixRole }) => {
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);

  // Form states
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [copyFromId, setCopyFromId] = useState<string>('none');

  // Fetch Roles
  const { data: rolesResponse, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['access-roles'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/roles');
      return (Array.isArray(res) ? res : res?.data || []) as RoleItem[];
    },
  });

  const roles = rolesResponse || [];

  // Create Role Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return await apiClient.post('/roles', {
        name: roleName.trim(),
        description: roleDescription.trim() || undefined,
        copy_from_id: copyFromId !== 'none' ? Number(copyFromId) : undefined,
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Role kustom berhasil dibuat.');
      queryClient.invalidateQueries({ queryKey: ['access-roles'] });
      setCreateModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal membuat role.');
    },
  });

  // Update Role Mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      return await apiClient.patch(`/roles/${selectedRole.id}`, {
        name: selectedRole.is_system ? undefined : roleName.trim(),
        description: roleDescription.trim(),
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Informasi role berhasil diperbarui.');
      queryClient.invalidateQueries({ queryKey: ['access-roles'] });
      setEditModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal memperbarui role.');
    },
  });

  // Delete Role Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRole) return;
      return await apiClient.delete(`/roles/${selectedRole.id}`);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Role kustom berhasil dihapus.');
      queryClient.invalidateQueries({ queryKey: ['access-roles'] });
      setDeleteModalOpen(false);
      setSelectedRole(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menghapus role.');
    },
  });

  const resetForm = () => {
    setRoleName('');
    setRoleDescription('');
    setCopyFromId('none');
    setSelectedRole(null);
  };

  const handleOpenEdit = (role: RoleItem) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    setEditModalOpen(true);
  };

  const handleOpenDelete = (role: RoleItem) => {
    setSelectedRole(role);
    setDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Daftar Role & Peran Sistem</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola peran operasional pengguna dan penugasan izin hak akses sistem.
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
          <Button
            onClick={() => {
              resetForm();
              setCreateModalOpen(true);
            }}
            size="sm"
            className="flex items-center gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Role Baru</span>
          </Button>
        </div>
      </div>

      {/* Roles Table Card */}
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span>Tabel Peran & Wewenang</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Role sistem (Superadmin, Admin, Teknisi, Sales) terkunci namanya dan tidak dapat dihapus.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border bg-muted/40">
                  <TableHead className="font-semibold text-xs text-muted-foreground">Nama Role</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Deskripsi Tugas</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground">Tipe Peran</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground text-center">Pengguna Aktif</TableHead>
                  <TableHead className="font-semibold text-xs text-muted-foreground text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Memuat data role...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <span className="text-sm font-semibold text-destructive">Gagal memuat data role</span>
                        <span className="text-xs text-muted-foreground">{(error as any)?.message || 'Terjadi kesalahan sistem'}</span>
                        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 text-xs">
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                          Muat Ulang
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Tidak ada role ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => {
                    const isSystem = Boolean(role.is_system || role.is_core_role);
                    return (
                      <TableRow key={role.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium text-foreground py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{role.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-md py-3.5">
                          {role.description || '-'}
                        </TableCell>
                        <TableCell className="py-3.5">
                          {isSystem ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-medium">
                              Sistem
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs font-medium">
                              Kustom
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            {role.user_count}
                          </span>
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {onSelectMatrixRole && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onSelectMatrixRole(role.id)}
                                className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                title="Buka Matriks Izin Role"
                              >
                                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                Matriks
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(role)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                              title="Ubah Role"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            {!isSystem && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDelete(role)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Hapus Role Kustom"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
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
        </CardContent>
      </Card>

      {/* Create Role Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Buat Role Kustom Baru</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Tambahkan peran baru ke dalam sistem dan tentukan wewenangnya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-role-name" className="text-xs font-medium text-foreground">
                Nama Role <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-role-name"
                placeholder="Contoh: Koordinator Lapangan"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                className="bg-background border-border text-foreground text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-role-desc" className="text-xs font-medium text-foreground">
                Deskripsi Tanggung Jawab
              </Label>
              <Input
                id="create-role-desc"
                placeholder="Ringkasan tugas peran ini"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                className="bg-background border-border text-foreground text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="copy-from-select" className="text-xs font-medium text-foreground">
                Salin Wewenang dari Role Lain (Opsional)
              </Label>
              <Select value={copyFromId} onValueChange={setCopyFromId}>
                <SelectTrigger id="copy-from-select" className="bg-background border-border text-foreground text-sm">
                  <SelectValue placeholder="Pilih role untuk disalin izinnya" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">-- Jangan Salin (Mulai dari Nol) --</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} ({r.permissions?.length || 0} izin)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(false)}
              disabled={createMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!roleName.trim() || createMutation.isPending}
              className="bg-primary text-primary-foreground"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Buat Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ubah Informasi Role</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedRole?.is_system
                ? 'Role sistem hanya dapat diubah deskripsinya.'
                : 'Perbarui nama dan deskripsi peran kustom ini.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-role-name" className="text-xs font-medium text-foreground">
                Nama Role
              </Label>
              <Input
                id="edit-role-name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={Boolean(selectedRole?.is_system || selectedRole?.is_core_role)}
                className="bg-background border-border text-foreground text-sm disabled:opacity-60"
              />
              {Boolean(selectedRole?.is_system || selectedRole?.is_core_role) && (
                <p className="text-[11px] text-muted-foreground">
                  Nama role bawaan sistem tidak dapat diganti.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-role-desc" className="text-xs font-medium text-foreground">
                Deskripsi
              </Label>
              <Input
                id="edit-role-desc"
                value={roleDescription}
                onChange={(e) => setRoleDescription(e.target.value)}
                placeholder="Deskripsi tugas dan tanggung jawab"
                className="bg-background border-border text-foreground text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={updateMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              className="bg-primary text-primary-foreground"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span>Hapus Role Kustom</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Apakah Anda yakin ingin menghapus role <strong className="text-foreground">{selectedRole?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>

          {selectedRole && selectedRole.user_count > 0 && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Penghapusan tidak diizinkan:</strong> Role ini saat ini masih memiliki{' '}
                <strong>{selectedRole.user_count} pengguna aktif</strong>. Harap pindahkan pengguna ke role lain sebelum menghapus role ini.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={Boolean(selectedRole && selectedRole.user_count > 0) || deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Ya, Hapus Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
