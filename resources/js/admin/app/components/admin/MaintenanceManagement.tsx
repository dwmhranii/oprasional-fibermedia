import React, { useState } from 'react';
import { useMaintenance, Ticket, Team, Severity, TicketStatus } from '../../context/MaintenanceContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Plus,
  Search,
  Filter,
  AlertTriangle,
  MapPin,
  Clock,
  Users,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  X,
  FileImage,
} from 'lucide-react';
import { toast } from 'sonner';

export const MaintenanceManagement: React.FC = () => {
  const { tickets, createTicket, updateTicketStatus, updateTicketTeam, deleteTicket } = useMaintenance();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');

  // Modal Create State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    location: '',
    severity: 'medium' as Severity,
    assignedTeam: 'Tim A' as Team,
  });

  // Modal Detail State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const uniqueTeams: Team[] = ['Tim A', 'Tim B', 'Tim C'];

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || ticket.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const handleCreateTicket = () => {
    if (!newTicket.title.trim()) {
      toast.error('Judul gangguan wajib diisi');
      return;
    }
    if (!newTicket.location.trim()) {
      toast.error('Lokasi wajib diisi');
      return;
    }

    createTicket({
      title: newTicket.title.trim(),
      description: newTicket.description.trim(),
      location: newTicket.location.trim(),
      severity: newTicket.severity,
      assignedTeam: newTicket.assignedTeam,
      reportedBy: 'Admin / Operational',
    });

    toast.success(`Tiket gangguan '${newTicket.title}' berhasil dibuat!`);
    setIsCreateModalOpen(false);
    setNewTicket({
      title: '',
      description: '',
      location: '',
      severity: 'medium',
      assignedTeam: 'Tim A',
    });
  };

  const handleStatusChange = (ticketId: string, title: string, newStatus: TicketStatus) => {
    updateTicketStatus(ticketId, newStatus);
    const statusText =
      newStatus === 'completed'
        ? 'SELESAI'
        : newStatus === 'in_progress'
        ? 'DALAM PENANGANAN'
        : 'ASSIGNED';
    toast.success(`Status tiket '${title}' diubah menjadi ${statusText}`);
  };

  const handleTeamChange = (ticketId: string, title: string, newTeam: Team) => {
    if (updateTicketTeam) {
      updateTicketTeam(ticketId, newTeam);
      toast.success(`Tiket '${title}' ditugaskan ulang ke ${newTeam}`);
    }
  };

  const handleDeleteTicket = (ticketId: string, title: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus tiket '${title}'?`)) return;
    if (deleteTicket) {
      deleteTicket(ticketId);
      toast.success(`Tiket '${title}' telah dihapus`);
    }
  };

  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case 'urgent':
        return <Badge className="bg-red-600 text-white border-0 font-bold">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white border-0 font-bold">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500 text-white border-0 font-bold">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-600 text-white border-0 font-bold">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200 font-bold">
            ✓ Selesai
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
            ⏳ In Progress
          </Badge>
        );
      case 'assigned':
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-200 font-bold">
            📋 Assigned
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
            Laporan Gangguan & Maintenance
          </h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            Kelola tiket gangguan insiden jaringan, penugasan tim teknisi, dan pemantauan perbaikan
          </p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Lapor Gangguan Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Buat Tiket Gangguan Baru
              </DialogTitle>
              <DialogDescription className="text-xs">
                Isi detail insiden gangguan untuk ditugaskan langsung ke tim teknisi lapangan.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-3 text-xs">
              <div className="grid gap-1">
                <Label htmlFor="title" className="font-bold text-gray-700">
                  Judul Gangguan <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Contoh: Kabel Fiber Optik Putus Tertimpa Pohon"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  className="h-9"
                />
              </div>

              <div className="grid gap-1">
                <Label htmlFor="location" className="font-bold text-gray-700">
                  Lokasi Insiden <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    id="location"
                    className="pl-9 h-9"
                    placeholder="Alamat lengkap / area kejadian"
                    value={newTicket.location}
                    onChange={(e) => setNewTicket({ ...newTicket, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="font-bold text-gray-700">Tingkat Urgensi</Label>
                  <Select
                    value={newTicket.severity}
                    onValueChange={(val: Severity) => setNewTicket({ ...newTicket, severity: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Ringan)</SelectItem>
                      <SelectItem value="medium">Medium (Sedang)</SelectItem>
                      <SelectItem value="high">High (Tinggi)</SelectItem>
                      <SelectItem value="urgent">Urgent (Darurat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1">
                  <Label className="font-bold text-gray-700">Tugaskan Ke Tim</Label>
                  <Select
                    value={newTicket.assignedTeam}
                    onValueChange={(val: Team) => setNewTicket({ ...newTicket, assignedTeam: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueTeams.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="description" className="font-bold text-gray-700">
                  Deskripsi / Catatan Tambahan
                </Label>
                <Textarea
                  id="description"
                  placeholder="Jelaskan detail kronologi atau dampak gangguan..."
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  className="text-xs min-h-[80px]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-9 text-xs"
              >
                Batal
              </Button>
              <Button onClick={handleCreateTicket} className="bg-red-600 hover:bg-red-700 text-white h-9 text-xs font-semibold">
                Buat Tiket Gangguan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Total Tiket Gangguan</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{tickets.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center font-bold">
              <Wrench className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Urgent & High</p>
              <p className="text-2xl font-black text-red-600 mt-1">
                {tickets.filter((t) => (t.severity === 'urgent' || t.severity === 'high') && t.status !== 'completed').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Dalam Penanganan</p>
              <p className="text-2xl font-black text-blue-600 mt-1">
                {tickets.filter((t) => t.status === 'in_progress').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Selesai Ditangani</p>
              <p className="text-2xl font-black text-green-600 mt-1">
                {tickets.filter((t) => t.status === 'completed').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari berdasarkan ID tiket, judul gangguan, atau lokasi..."
                className="pl-9 text-xs h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-36">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val as TicketStatus | 'all')}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-36">
                <Select
                  value={severityFilter}
                  onValueChange={(val) => setSeverityFilter(val as Severity | 'all')}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Urgensi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Urgensi</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <Card className="border-gray-200 shadow-sm p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-800 text-sm">Tidak ada tiket gangguan ditemukan</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              Coba sesuaikan kata kunci pencarian atau filter status dan tingkat urgensi.
            </p>
          </Card>
        ) : (
          filteredTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="border-gray-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden"
            >
              <CardContent className="p-5">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  {/* Left Ticket Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        {ticket.id}
                      </span>
                      {getSeverityBadge(ticket.severity)}
                      {getStatusBadge(ticket.status)}
                      <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                        👥 {ticket.assignedTeam}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-gray-900 leading-snug">
                      {ticket.title}
                    </h3>

                    <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
                      {ticket.description || 'Tidak ada catatan rinci.'}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-gray-700">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        {ticket.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {ticket.createdAt}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        Pelapor: {ticket.reportedBy}
                      </span>
                    </div>
                  </div>

                  {/* Right Action Controls for Admin */}
                  <div className="flex flex-wrap items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 w-full md:w-auto">
                    {/* Status Dropdown */}
                    <div className="w-36">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">
                        Ubah Status
                      </label>
                      <select
                        value={ticket.status}
                        onChange={(e) =>
                          handleStatusChange(ticket.id, ticket.title, e.target.value as TicketStatus)
                        }
                        className="w-full h-8 rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    {/* Team Dropdown */}
                    <div className="w-28">
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">
                        Tim Teknisi
                      </label>
                      <select
                        value={ticket.assignedTeam}
                        onChange={(e) =>
                          handleTeamChange(ticket.id, ticket.title, e.target.value as Team)
                        }
                        className="w-full h-8 rounded-md border border-gray-300 bg-white px-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                      >
                        {uniqueTeams.map((team) => (
                          <option key={team} value={team}>
                            {team}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 pt-3 md:pt-3.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedTicket(ticket)}
                        title="Lihat Detail & Bukti"
                        className="h-8 text-xs bg-white text-blue-700 border-blue-200 hover:bg-blue-50 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Detail
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTicket(ticket.id, ticket.title)}
                        title="Hapus Tiket"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal Detail Ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 p-5 text-white flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-white/20 px-2 py-0.5 rounded">
                    {selectedTicket.id}
                  </span>
                  {getSeverityBadge(selectedTicket.severity)}
                </div>
                <h3 className="font-bold text-lg mt-1 text-white">{selectedTicket.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-white/80 hover:text-white p-1 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Status Penanganan</p>
                  <div className="mt-1">{getStatusBadge(selectedTicket.status)}</div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase">Tim Petugas</p>
                  <p className="font-bold text-purple-700 mt-1">👥 {selectedTicket.assignedTeam}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  Lokasi Kejadian:
                </p>
                <p className="text-gray-800 bg-gray-50 p-2.5 rounded-lg border border-gray-100 font-medium">
                  {selectedTicket.location}
                </p>
              </div>

              <div>
                <p className="font-bold text-gray-700 mb-1">Rincian Insiden:</p>
                <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 leading-relaxed">
                  {selectedTicket.description || 'Tidak ada catatan deskripsi.'}
                </p>
              </div>

              {selectedTicket.completionNotes && (
                <div>
                  <p className="font-bold text-green-700 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Catatan Penyelesaian Teknisi:
                  </p>
                  <p className="text-green-900 bg-green-50 p-2.5 rounded-lg border border-green-200 font-medium">
                    {selectedTicket.completionNotes}
                  </p>
                </div>
              )}

              {selectedTicket.completionPhoto && (
                <div>
                  <p className="font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <FileImage className="w-3.5 h-3.5 text-blue-600" />
                    Foto Bukti Perbaikan:
                  </p>
                  <div className="h-48 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                    <img
                      src={selectedTicket.completionPhoto}
                      alt="Foto Bukti Selesai"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTicket(null)}
                  className="h-9 text-xs"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
