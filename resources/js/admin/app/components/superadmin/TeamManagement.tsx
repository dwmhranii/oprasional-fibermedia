import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Plus,
  Search,
  Wrench,
  ShieldCheck,
  Activity,
  Edit2,
  Trash2,
  Power,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  RefreshCw,
  Loader2,
  UserCheck,
  UserX,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Skeleton } from '../ui/skeleton';
import { teamService, Team, TeamMember } from '../../lib/teamService';

export const TeamManagement: React.FC = () => {
  const queryClient = useQueryClient();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Selected team state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Form states
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  // Member assignment state: set of selected technician user IDs for the active team
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // 1. Fetch Teams Query
  const {
    data: teams = [],
    isLoading: isTeamsLoading,
    isRefetching,
    refetch: refetchTeams,
  } = useQuery({
    queryKey: ['superadmin', 'teams'],
    queryFn: () => teamService.getTeams(),
  });

  // 2. Fetch All Registered Technicians
  const {
    data: allTechnicians = [],
    isLoading: isTechLoading,
    refetch: refetchTechnicians,
  } = useQuery({
    queryKey: ['superadmin', 'technicians', 'all'],
    queryFn: () => teamService.getAllTechnicians(),
  });

  // Mutations
  const createTeamMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; is_active?: boolean }) =>
      teamService.createTeam(data),
    onSuccess: () => {
      toast.success('Tim teknisi baru berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'teams'] });
      setIsCreateModalOpen(false);
      setTeamForm({ name: '', description: '', is_active: true });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal membuat tim teknisi');
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; description?: string; is_active?: boolean } }) =>
      teamService.updateTeam(id, data),
    onSuccess: () => {
      toast.success('Data tim berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'teams'] });
      setIsEditModalOpen(false);
      setSelectedTeam(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal memperbarui tim');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: number; currentStatus: boolean }) =>
      teamService.toggleTeamStatus(id, currentStatus),
    onSuccess: () => {
      toast.success('Status operasional tim berhasil diubah');
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'teams'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mengubah status tim');
    },
  });

  const updateMembersMutation = useMutation({
    mutationFn: ({ teamId, userIds }: { teamId: number; userIds: number[] }) =>
      teamService.updateTeamMembers(teamId, userIds),
    onSuccess: () => {
      toast.success('Personil tim teknisi berhasil diperbarui');
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'teams'] });
      setIsMembersModalOpen(false);
      setSelectedTeam(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mengatur anggota tim');
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: number) => teamService.deleteTeam(id),
    onSuccess: () => {
      toast.success('Tim berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'teams'] });
      setIsDeleteDialogOpen(false);
      setSelectedTeam(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menghapus tim teknisi');
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    const total = teams.length;
    const active = teams.filter((t) => t.is_active).length;
    const inactive = total - active;
    const totalMembersAssigned = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
    const totalActiveTickets = teams.reduce((acc, t) => acc + (t.active_tickets_count || 0), 0);

    return { total, active, inactive, totalMembersAssigned, totalActiveTickets };
  }, [teams]);

  // Filtered teams list
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const matchesSearch =
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.members?.some((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? team.is_active
          : !team.is_active;

      return matchesSearch && matchesStatus;
    });
  }, [teams, searchQuery, statusFilter]);

  // Map technician assignment: which team is a technician currently in?
  const techTeamMap = useMemo(() => {
    const map = new Map<number, string>();
    teams.forEach((t) => {
      t.members?.forEach((m) => {
        map.set(m.id, t.name);
      });
    });
    return map;
  }, [teams]);

  // Handlers
  const handleOpenCreate = () => {
    setTeamForm({ name: '', description: '', is_active: true });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (team: Team) => {
    setSelectedTeam(team);
    setTeamForm({
      name: team.name,
      description: team.description || '',
      is_active: team.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenMembers = (team: Team) => {
    setSelectedTeam(team);
    setSelectedMemberIds((team.members || []).map((m) => m.id));
    setMemberSearchQuery('');
    setIsMembersModalOpen(true);
  };

  const handleOpenDelete = (team: Team) => {
    setSelectedTeam(team);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleMember = (userId: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleRemoveMember = (userId: number) => {
    setSelectedMemberIds((prev) => prev.filter((id) => id !== userId));
  };

  const handleSaveMembers = () => {
    if (!selectedTeam) return;
    updateMembersMutation.mutate({
      teamId: selectedTeam.id,
      userIds: selectedMemberIds,
    });
  };

  const getInitials = (name: string) => {
    if (!name) return 'TK';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-rose-950 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 flex items-center justify-end pr-8 pointer-events-none">
          <Wrench className="w-56 h-56" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30 text-rose-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              Superadmin Control Center
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Manajemen Tim Teknisi Lapangan
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Atur komposisi grup teknisi fisik, alokasikan personil, dan monitor pembagian tiket pengaduan
              dengan algoritma otomatis <em>Least-Loaded Round Robin</em>.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchTeams();
                refetchTechnicians();
              }}
              disabled={isTeamsLoading || isRefetching}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold h-10 px-4"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleOpenCreate}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg shadow-rose-900/40 h-10 px-5"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Tambah Tim Baru
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Tim Lapangan
              </p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">
                {isTeamsLoading ? <Skeleton className="h-7 w-12" /> : stats.total}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Semua grup terdaftar</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tim Siap Tugas
              </p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                {isTeamsLoading ? <Skeleton className="h-7 w-12" /> : stats.active}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">Status Aktif & Siap</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Teknisi Terpetakan
              </p>
              <h3 className="text-2xl font-black text-blue-600 mt-1">
                {isTeamsLoading ? <Skeleton className="h-7 w-12" /> : stats.totalMembersAssigned}
              </h3>
              <p className="text-xs text-blue-600 font-medium mt-0.5">
                Dari total {allTechnicians.length} teknisi
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Beban Tiket Aktif
              </p>
              <h3 className="text-2xl font-black text-amber-600 mt-1">
                {isTeamsLoading ? <Skeleton className="h-7 w-12" /> : stats.totalActiveTickets}
              </h3>
              <p className="text-xs text-amber-600 font-medium mt-0.5">Dalam penanganan</p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
              <Activity className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari nama tim, deskripsi, atau nama personil..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs md:text-sm bg-slate-50/50 border-slate-200 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-full md:w-48">
              <Select
                value={statusFilter}
                onValueChange={(val: any) => setStatusFilter(val)}
              >
                <SelectTrigger className="h-10 text-xs bg-slate-50/50 border-slate-200">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="active">Hanya Tim Aktif</SelectItem>
                  <SelectItem value="inactive">Hanya Tim Non-aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-xs text-slate-600 hover:text-slate-900"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Team Grid */}
      {isTeamsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-16 w-full rounded-xl" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredTeams.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 shadow-sm py-16 text-center">
          <CardContent className="space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Tidak ada tim yang ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Tidak ada tim yang cocok dengan kriteria pencarian atau filter yang Anda pilih.'
                : 'Belum ada grup tim teknisi lapangan yang dibuat. Mulai buat tim pertama sekarang.'}
            </p>
            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs mt-2"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Tambah Tim Sekarang
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => {
            const memberCount = team.members?.length || 0;
            const ticketCount = team.active_tickets_count || 0;

            return (
              <Card
                key={team.id}
                className={`border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  team.is_active
                    ? 'border-slate-200/90 hover:border-indigo-300 hover:shadow-lg shadow-sm bg-white'
                    : 'border-slate-200 bg-slate-50/70 opacity-80'
                }`}
              >
                <div>
                  {/* Card Header & Status */}
                  <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-transparent">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-slate-900 tracking-tight">
                            {team.name}
                          </h3>
                          {team.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px] font-bold">
                              AKTIF
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-slate-300 text-[10px] font-bold">
                              NON-AKTIF
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {team.description || 'Tidak ada deskripsi wilayah atau catatan operasional.'}
                        </p>
                      </div>

                      {/* Status Toggle Switch */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Switch
                          checked={team.is_active}
                          onCheckedChange={() =>
                            toggleStatusMutation.mutate({
                              id: team.id,
                              currentStatus: team.is_active,
                            })
                          }
                          disabled={toggleStatusMutation.isPending}
                          className="data-[state=checked]:bg-emerald-600"
                        />
                        <span className="text-[10px] text-slate-400 font-medium">
                          {team.is_active ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>

                    {/* Workload Indicator (Least-Loaded indicator) */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="bg-white rounded-xl p-2.5 border border-slate-200/80 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">
                            Personil
                          </p>
                          <p className="text-xs font-bold text-slate-800">
                            {memberCount} Teknisi
                          </p>
                        </div>
                      </div>

                      <div
                        className={`rounded-xl p-2.5 border flex items-center gap-2.5 ${
                          ticketCount === 0
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
                            : ticketCount <= 2
                            ? 'bg-amber-50/70 border-amber-200 text-amber-800'
                            : 'bg-rose-50/70 border-rose-200 text-rose-800'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            ticketCount === 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : ticketCount <= 2
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          <Activity className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-semibold opacity-80">
                            Tiket Aktif
                          </p>
                          <p className="text-xs font-bold">
                            {ticketCount === 0 ? '0 (Siap Tugas)' : `${ticketCount} Tiket`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Members Section */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Daftar Anggota Tim ({memberCount})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenMembers(team)}
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold h-7 px-2"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Atur Anggota
                      </Button>
                    </div>

                    {memberCount === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-1.5">
                        <UserX className="w-5 h-5 mx-auto text-slate-400" />
                        <p className="text-xs font-semibold text-slate-600">Belum ada personil</p>
                        <p className="text-[11px] text-slate-400">
                          Masukkan teknisi agar tim dapat menerima penugasan tiket.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenMembers(team)}
                          className="text-xs h-7 mt-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                        >
                          + Tambah Personil
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {team.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-slate-100/80 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="w-7 h-7 border border-slate-200 shrink-0">
                                <AvatarFallback className="bg-slate-800 text-white font-bold text-[10px]">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {member.name}
                                </p>
                                {member.phone ? (
                                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5" />
                                    {member.phone}
                                  </p>
                                ) : (
                                  <p className="text-[10px] text-slate-400">Teknisi Lapangan</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 font-semibold shrink-0">
                              ID: {member.id}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(team)}
                    className="flex-1 text-xs font-semibold h-8 border-slate-200 hover:bg-white text-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit Tim
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDelete(team)}
                    className="text-xs font-semibold h-8 px-2.5 border-rose-200 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Tambah Tim Baru */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <Plus className="w-5 h-5 text-rose-600" />
              Buat Tim Teknisi Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tambahkan grup tim teknisi baru yang akan menerima tugas pemasangan dan perbaikan pengaduan.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!teamForm.name.trim()) {
                toast.error('Nama tim wajib diisi');
                return;
              }
              createTeamMutation.mutate(teamForm);
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="team-name" className="text-xs font-bold text-slate-700">
                Nama Tim <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="team-name"
                placeholder="Contoh: Team A, Team Delta, Tim Reaksi Cepat"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="team-desc" className="text-xs font-bold text-slate-700">
                Deskripsi / Area Operasional
              </Label>
              <Textarea
                id="team-desc"
                placeholder="Contoh: Area Malang Barat & Dinoyo, standby pukul 08:00 - 17:00"
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="space-y-0.5">
                <Label htmlFor="team-active" className="text-xs font-bold text-slate-800">
                  Status Tim Aktif
                </Label>
                <p className="text-[11px] text-slate-500">
                  Tim aktif akan masuk dalam antrian penugasan tiket Round Robin.
                </p>
              </div>
              <Switch
                id="team-active"
                checked={teamForm.is_active}
                onCheckedChange={(checked) => setTeamForm({ ...teamForm, is_active: checked })}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createTeamMutation.isPending}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                {createTeamMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Buat Tim'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Edit Tim */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <Edit2 className="w-5 h-5 text-indigo-600" />
              Edit Informasi Tim
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Perbarui nama, catatan wilayah, atau status keaktifan tim.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!selectedTeam || !teamForm.name.trim()) return;
              updateTeamMutation.mutate({
                id: selectedTeam.id,
                data: teamForm,
              });
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="edit-team-name" className="text-xs font-bold text-slate-700">
                Nama Tim <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="edit-team-name"
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-team-desc" className="text-xs font-bold text-slate-700">
                Deskripsi / Area Operasional
              </Label>
              <Textarea
                id="edit-team-desc"
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="space-y-0.5">
                <Label htmlFor="edit-team-active" className="text-xs font-bold text-slate-800">
                  Status Tim Aktif
                </Label>
                <p className="text-[11px] text-slate-500">
                  Jika dinonaktifkan, sistem tidak akan menugaskan tiket baru ke tim ini.
                </p>
              </div>
              <Switch
                id="edit-team-active"
                checked={teamForm.is_active}
                onCheckedChange={(checked) => setTeamForm({ ...teamForm, is_active: checked })}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(false)}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateTeamMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                {updateTeamMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Kelola Anggota Personil Tim */}
      <Dialog open={isMembersModalOpen} onOpenChange={setIsMembersModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2 text-slate-900 font-bold">
              <Users className="w-5 h-5 text-blue-600" />
              Kelola Personil: {selectedTeam?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Pilih teknisi yang ditugaskan ke dalam <strong>{selectedTeam?.name}</strong>.
              Seluruh teknisi dalam tim yang sama akan melihat tiket pengaduan yang sama.
            </DialogDescription>
          </DialogHeader>

          {/* Current Members Chips */}
          <div className="shrink-0 pt-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Anggota Terpilih ({selectedMemberIds.length})
              </span>
              {selectedMemberIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMemberIds([])}
                  className="text-[11px] text-rose-600 h-6 px-2"
                >
                  Hapus Semua
                </Button>
              )}
            </div>

            <div className="min-h-12 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-1.5">
              {selectedMemberIds.length === 0 ? (
                <p className="text-xs text-slate-400 italic self-center">
                  Belum ada personil yang dipilih untuk tim ini.
                </p>
              ) : (
                selectedMemberIds.map((id) => {
                  const tech = allTechnicians.find((t) => t.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold"
                    >
                      <span>{tech?.name || `Teknisi #${id}`}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(id)}
                        className="text-blue-600 hover:text-rose-600 rounded-full hover:bg-blue-200/50 p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })
              )}
            </div>
          </div>

          {/* Search Technicians */}
          <div className="shrink-0 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Cari teknisi berdasarkan nama atau no. telepon..."
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {/* Technicians Selection List */}
          <div className="flex-1 overflow-y-auto min-h-48 max-h-64 border rounded-xl border-slate-200 p-2 space-y-1.5 mt-2">
            {isTechLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : allTechnicians.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Tidak ada data teknisi yang terdaftar di sistem.
              </p>
            ) : (
              allTechnicians
                .filter(
                  (tech) =>
                    tech.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
                    tech.phone?.includes(memberSearchQuery)
                )
                .map((tech) => {
                  const isSelected = selectedMemberIds.includes(tech.id);
                  const currentAssignedTeam = techTeamMap.get(tech.id);
                  const isInOtherTeam =
                    currentAssignedTeam && currentAssignedTeam !== selectedTeam?.name;

                  return (
                    <div
                      key={tech.id}
                      onClick={() => handleToggleMember(tech.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 border-blue-300'
                          : 'bg-white border-slate-200/70 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="w-8 h-8 border border-slate-200 shrink-0">
                          <AvatarFallback className="bg-slate-800 text-white font-bold text-xs">
                            {getInitials(tech.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {tech.name}
                            </span>
                            {isInOtherTeam && (
                              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200">
                                Saat ini di {currentAssignedTeam}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {tech.phone || tech.email || 'Tanpa no. telepon'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Terpilih
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] text-slate-600 border-slate-200 hover:border-blue-400"
                          >
                            Pilih
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          <DialogFooter className="shrink-0 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMembersModalOpen(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveMembers}
              disabled={updateMembersMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
            >
              {updateMembersMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Menyimpan Personil...
                </>
              ) : (
                `Simpan Personil (${selectedMemberIds.length})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: Hapus Tim */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              Hapus Tim {selectedTeam?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500 space-y-2">
              <p>
                Apakah Anda yakin ingin menghapus <strong>{selectedTeam?.name}</strong>?
                Tindakan ini tidak dapat dibatalkan.
              </p>
              {selectedTeam && (selectedTeam.members?.length || 0) > 0 && (
                <p className="text-amber-600 font-semibold bg-amber-50 p-2 rounded-lg border border-amber-200">
                  Perhatian: Tim ini memiliki {selectedTeam.members?.length} personil teknisi aktif.
                  Personil akan dilepas dari tim ini.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedTeam) {
                  deleteTeamMutation.mutate(selectedTeam.id);
                }
              }}
              disabled={deleteTeamMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              {deleteTeamMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Tim'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
