import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Eye,
  Menu,
} from 'lucide-react';
import { toast } from 'sonner';

interface ActionMeta {
  name: string;
  label: string;
  description: string;
  is_locked: boolean;
  is_sensitive: boolean;
  prerequisites: string[];
}

interface ModuleMeta {
  module_key: string;
  module_name: string;
  actions: ActionMeta[];
}

interface RoleItem {
  id: number;
  name: string;
  description?: string;
  user_count: number;
  permissions?: string[];
  is_system?: boolean;
}

interface PermissionMatrixTabProps {
  initialRoleId?: number;
}

export const PermissionMatrixTab: React.FC<PermissionMatrixTabProps> = ({ initialRoleId }) => {
  const queryClient = useQueryClient();

  // Selected role
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(initialRoleId || null);

  // Selected permissions set
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Modals
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [superadminPassword, setSuperadminPassword] = useState('');

  // Fetch Roles
  const { data: rolesData, isLoading: isLoadingRoles, isError: isErrorRoles, error: errorRoles, refetch: refetchRoles } = useQuery({
    queryKey: ['access-roles'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/roles');
      return (Array.isArray(res) ? res : res?.data || []) as RoleItem[];
    },
  });

  const roles = rolesData || [];

  const activeRole = useMemo(() => {
    if (!roles.length) return null;
    if (selectedRoleId) {
      return roles.find((r) => r.id === selectedRoleId) || roles[0];
    }
    return roles.find((r) => r.name.toLowerCase() === 'admin') || roles[0];
  }, [roles, selectedRoleId]);

  // Fetch Permissions Catalog
  const { data: catalogData, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['access-permissions-catalog'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/permissions');
      return (res?.catalog || res?.data || []) as ModuleMeta[];
    },
  });

  const catalog = catalogData || [];

  // Flatten map of all actions for quick lookup
  const actionMap = useMemo(() => {
    const map = new Map<string, ActionMeta>();
    catalog.forEach((m) => {
      m.actions.forEach((a) => {
        map.set(a.name, a);
      });
    });
    return map;
  }, [catalog]);

  // Sync state when active role changes
  useEffect(() => {
    if (activeRole) {
      setSelectedPermissions([...(activeRole.permissions || [])]);
    }
  }, [activeRole]);

  const isSuperadmin = activeRole?.name.toLowerCase() === 'superadmin';

  // Toggle permission with auto prerequisite enforcement
  const handleTogglePermission = (actionName: string) => {
    if (isSuperadmin) return;

    const action = actionMap.get(actionName);
    if (!action) return;

    if (action.is_locked) {
      toast.error(`Izin '${action.label}' terkunci khusus untuk Superadmin.`);
      return;
    }

    const isCurrentlyChecked = selectedPermissions.includes(actionName);

    if (!isCurrentlyChecked) {
      // Checking: auto-check all prerequisites
      const newPerms = new Set(selectedPermissions);
      newPerms.add(actionName);

      // Recursive add prerequisites
      const addPrereqs = (pName: string) => {
        const meta = actionMap.get(pName);
        if (meta && meta.prerequisites) {
          meta.prerequisites.forEach((req) => {
            newPerms.add(req);
            addPrereqs(req);
          });
        }
      };

      addPrereqs(actionName);
      setSelectedPermissions(Array.from(newPerms));
    } else {
      // Unchecking: auto-uncheck any permission that depends on this action
      const newPerms = new Set(selectedPermissions);
      newPerms.delete(actionName);

      // Find all dependent actions
      const removeDependents = (targetName: string) => {
        catalog.forEach((m) => {
          m.actions.forEach((a) => {
            if (a.prerequisites && a.prerequisites.includes(targetName)) {
              newPerms.delete(a.name);
              removeDependents(a.name);
            }
          });
        });
      };

      removeDependents(actionName);
      setSelectedPermissions(Array.from(newPerms));
    }
  };

  // Toggle all actions in module
  const handleToggleModule = (mod: ModuleMeta) => {
    if (isSuperadmin) return;

    const modActions = mod.actions.filter((a) => !a.is_locked);
    const modActionNames = modActions.map((a) => a.name);
    const allChecked = modActionNames.every((name) => selectedPermissions.includes(name));

    if (allChecked) {
      // Uncheck all in this module and their dependents
      const newPerms = new Set(selectedPermissions);
      modActionNames.forEach((name) => {
        newPerms.delete(name);
      });
      // Cascade uncheck dependents
      catalog.forEach((m) => {
        m.actions.forEach((a) => {
          if (a.prerequisites && a.prerequisites.some((req) => modActionNames.includes(req))) {
            newPerms.delete(a.name);
          }
        });
      });
      setSelectedPermissions(Array.from(newPerms));
    } else {
      // Check all in this module and their prerequisites
      const newPerms = new Set(selectedPermissions);
      modActions.forEach((a) => {
        newPerms.add(a.name);
        a.prerequisites?.forEach((req) => newPerms.add(req));
      });
      setSelectedPermissions(Array.from(newPerms));
    }
  };

  // Calculate Diff for Save confirmation
  const diff = useMemo(() => {
    if (!activeRole) return { added: [], revoked: [] };
    const original = activeRole.permissions || [];
    const added = selectedPermissions.filter((p) => !original.includes(p));
    const revoked = original.filter((p) => !selectedPermissions.includes(p));
    return { added, revoked };
  }, [activeRole, selectedPermissions]);

  const hasUnsavedChanges = diff.added.length > 0 || diff.revoked.length > 0;

  // Check if newly added permissions contain sensitive actions
  const newlyAddedSensitive = useMemo(() => {
    return diff.added.filter((pName) => {
      const meta = actionMap.get(pName);
      return meta?.is_sensitive;
    });
  }, [diff.added, actionMap]);

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeRole) return;
      return await apiClient.put(`/roles/${activeRole.id}/permissions`, {
        permissions: selectedPermissions,
        password: superadminPassword.trim(),
      });
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Hak akses role berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['access-roles'] });
      queryClient.invalidateQueries({ queryKey: ['access-menu-preview'] });
      queryClient.invalidateQueries({ queryKey: ['dynamicMenu'] });
      setSaveModalOpen(false);
      setSuperadminPassword('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan hak akses.');
    },
  });

  // Reset to Default Mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!activeRole) return;
      return await apiClient.post(`/roles/${activeRole.id}/reset`);
    },
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Hak akses dikembalikan ke bawaan registri.');
      queryClient.invalidateQueries({ queryKey: ['access-roles'] });
      queryClient.invalidateQueries({ queryKey: ['access-menu-preview'] });
      queryClient.invalidateQueries({ queryKey: ['dynamicMenu'] });
      setResetModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal mereset hak akses.');
    },
  });

  // Live Menu Preview Query
  const { data: menuPreviewData, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['access-menu-preview', activeRole?.id, selectedPermissions],
    queryFn: async () => {
      if (!activeRole) return [];
      const res = await apiClient.get<any>(`/roles/${activeRole.id}/menu-preview`, {
        params: {
          permissions: selectedPermissions,
        },
      });
      return res?.menu_tree || [];
    },
    enabled: Boolean(activeRole),
  });

  const previewMenu = menuPreviewData || [];

  return (
    <div className="space-y-6">
      {/* Role Picker & Action Bar */}
      <Card className="border border-border bg-card shadow-sm">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-full sm:w-64">
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                Pilih Role yang Dikelola
              </Label>
              <Select
                value={activeRole ? String(activeRole.id) : ''}
                onValueChange={(val) => setSelectedRoleId(Number(val))}
                disabled={isLoadingRoles}
              >
                <SelectTrigger className="bg-background border-border text-foreground font-semibold text-sm">
                  <SelectValue placeholder={isLoadingRoles ? 'Memuat role...' : 'Pilih Role'} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)} className="text-sm font-medium">
                      {r.name} {r.is_system ? '(Sistem)' : '(Kustom)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isErrorRoles && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-destructive">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Gagal memuat role.</span>
                  <button type="button" onClick={() => refetchRoles()} className="underline font-medium hover:text-destructive/80">
                    Coba lagi
                  </button>
                </div>
              )}
            </div>

            {activeRole && (
              <div className="flex items-center gap-2 mt-2 sm:mt-5">
                {activeRole.is_system ? (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                    Role Sistem
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
                    Role Kustom
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {selectedPermissions.length} izin aktif
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {!isSuperadmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResetModalOpen(true)}
                className="text-xs flex items-center gap-1.5"
                title="Kembalikan izin role ini ke nilai bawaan registri"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kembalikan ke Bawaan</span>
              </Button>
            )}

            {!isSuperadmin && (
              <Button
                onClick={() => setSaveModalOpen(true)}
                disabled={!hasUnsavedChanges}
                size="sm"
                className="text-xs flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Hak Akses</span>
                {hasUnsavedChanges && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Permissions Matrix (Left) + Menu Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Modules & Permissions Checkboxes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Cari izin hak akses atau wewenang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card border-border text-foreground text-sm"
            />
          </div>

          {isSuperadmin && (
            <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
              <span>
                <strong>Superadmin memiliki akses tak terbatas (Bypass Gate::before).</strong> Seluruh izin sistem aktif secara otomatis dan tidak dapat diubah.
              </span>
            </div>
          )}

          {isLoadingCatalog || isLoadingRoles ? (
            <Card className="border border-border bg-card p-12 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm">Memuat katalog wewenang hak akses...</p>
            </Card>
          ) : (
            catalog.map((mod) => {
              const filteredActions = mod.actions.filter(
                (a) =>
                  !searchQuery ||
                  a.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  a.description.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (searchQuery && filteredActions.length === 0) return null;

              const isCollapsed = Boolean(collapsedModules[mod.module_key]);
              const modActionNames = mod.actions.map((a) => a.name);
              const checkedCount = modActionNames.filter((name) =>
                selectedPermissions.includes(name)
              ).length;
              const allChecked = modActionNames.length > 0 && checkedCount === modActionNames.length;

              return (
                <Card key={mod.module_key} className="border border-border bg-card shadow-sm overflow-hidden">
                  <div
                    onClick={() =>
                      setCollapsedModules((prev) => ({
                        ...prev,
                        [mod.module_key]: !isCollapsed,
                      }))
                    }
                    className="p-3.5 bg-muted/40 border-b border-border flex items-center justify-between cursor-pointer select-none hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm text-foreground">
                        {mod.module_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({checkedCount}/{mod.actions.length} aktif)
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!isSuperadmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleModule(mod)}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {allChecked ? 'Batal Pilih Semua' : 'Pilih Semua'}
                        </Button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          setCollapsedModules((prev) => ({
                            ...prev,
                            [mod.module_key]: !isCollapsed,
                          }))
                        }
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <CardContent className="p-0 divide-y divide-border">
                      {filteredActions.map((action) => {
                        const isChecked = isSuperadmin || selectedPermissions.includes(action.name);
                        const isLocked = action.is_locked;

                        return (
                          <div
                            key={action.name}
                            onClick={() => !isSuperadmin && !isLocked && handleTogglePermission(action.name)}
                            className={`p-3.5 flex items-start justify-between gap-3 transition-colors ${
                              isSuperadmin || isLocked
                                ? 'opacity-85 cursor-not-allowed bg-muted/10'
                                : 'cursor-pointer hover:bg-muted/20'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSuperadmin || isLocked}
                                onChange={() => handleTogglePermission(action.name)}
                                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {action.label}
                                  </span>
                                  {isLocked && (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                      title="Izin terkunci khusus untuk Superadmin"
                                    >
                                      <Lock className="w-3 h-3" />
                                      Terkunci Superadmin
                                    </span>
                                  )}
                                  {action.is_sensitive && (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-destructive/10 text-destructive border border-destructive/20"
                                      title="Wewenang tingkat tinggi/sensitif"
                                    >
                                      <AlertTriangle className="w-3 h-3" />
                                      Sensitif
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {action.description}
                                </p>
                                {action.prerequisites && action.prerequisites.length > 0 && (
                                  <p className="text-[11px] text-muted-foreground/80 mt-1">
                                    Mensyaratkan:{' '}
                                    <code className="text-primary font-mono text-[10px]">
                                      {action.prerequisites.join(', ')}
                                    </code>
                                  </p>
                                )}
                              </div>
                            </div>

                            <span className="text-[11px] font-mono text-muted-foreground shrink-0 mt-0.5">
                              {action.name}
                            </span>
                          </div>
                        );
                      })}
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Right Column (1 Col): Live Sidebar Menu Preview */}
        <div className="space-y-4">
          <Card className="border border-border bg-card shadow-sm sticky top-6">
            <CardHeader className="pb-3 border-b border-border bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center justify-between text-foreground">
                <div className="flex items-center gap-2">
                  <Menu className="w-4 h-4 text-primary" />
                  <span>Pratinjau Menu Sidebar</span>
                </div>
                {isLoadingPreview && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Simulasi menu dan tab yang akan terlihat oleh pengguna role{' '}
                <strong className="text-foreground">{activeRole?.name}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {previewMenu.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  Role ini belum memiliki izin untuk melihat menu sidebar apapun.
                </div>
              ) : (
                previewMenu.map((group: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    {group.group && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 pt-2">
                        {group.group}
                      </div>
                    )}
                    <div className="space-y-1">
                      {group.items.map((item: any) => (
                        <div
                          key={item.route}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-muted/30 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            <span className="truncate">{item.title}</span>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                            {item.route}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Confirmation Dialog (with Diff & Password Input) */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <span>Konfirmasi Perubahan Hak Akses</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Menyimpan konfigurasi hak akses baru untuk role{' '}
              <strong className="text-foreground">{activeRole?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Diff Summary */}
            <div className="space-y-2 max-h-56 overflow-y-auto p-3 rounded-lg bg-muted/30 border border-border">
              <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Rincian Perubahan Izin:</span>
                <span className="text-muted-foreground font-normal">
                  +{diff.added.length} / -{diff.revoked.length}
                </span>
              </div>

              {diff.added.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Izin Baru Ditambahkan (+):
                  </div>
                  {diff.added.map((name) => (
                    <div
                      key={name}
                      className="text-xs text-foreground bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono text-[11px]"
                    >
                      + {name} ({actionMap.get(name)?.label || name})
                    </div>
                  ))}
                </div>
              )}

              {diff.revoked.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                    Izin Dicabut (-):
                  </div>
                  {diff.revoked.map((name) => (
                    <div
                      key={name}
                      className="text-xs text-foreground bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-mono text-[11px]"
                    >
                      - {name} ({actionMap.get(name)?.label || name})
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Warning if sensitive actions added */}
            {newlyAddedSensitive.length > 0 && (
              <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Peringatan Izin Sensitif:</strong> Perubahan ini memberikan wewenang
                  tingkat tinggi (mis. ekspor, lihat rahasia, atau hapus data). Harap pastikan
                  tindakan ini telah sesuai dengan kebijakan operasional.
                </div>
              </div>
            )}

            {/* Password input */}
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="superadmin-pass" className="text-xs font-semibold text-foreground">
                Konfirmasi Kata Sandi Superadmin <span className="text-destructive">*</span>
              </Label>
              <Input
                id="superadmin-pass"
                type="password"
                placeholder="Masukkan kata sandi Anda untuk konfirmasi wewenang"
                value={superadminPassword}
                onChange={(e) => setSuperadminPassword(e.target.value)}
                className="bg-background border-border text-foreground text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Perubahan izin berdampak langsung kepada seluruh pengguna dengan role ini.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSaveModalOpen(false)}
              disabled={saveMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!superadminPassword.trim() || saveMutation.isPending}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Memverifikasi & Menyimpan...
                </>
              ) : (
                'Konfirmasi & Simpan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              <span>Kembalikan ke Nilai Bawaan</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Apakah Anda yakin ingin mengembalikan seluruh izin role{' '}
              <strong className="text-foreground">{activeRole?.name}</strong> ke nilai bawaan registri kode sistem?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-md bg-muted/40 border border-border text-xs text-muted-foreground">
            Perubahan manual yang pernah dibuat untuk role ini akan digantikan oleh himpunan izin standar registri modul.
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setResetModalOpen(false)}
              disabled={resetMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {resetMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Mereset...
                </>
              ) : (
                'Ya, Kembalikan ke Bawaan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
