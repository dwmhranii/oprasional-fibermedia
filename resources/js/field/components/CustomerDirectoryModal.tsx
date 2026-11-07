import React, { useState } from 'react';
import {
  X,
  Search,
  Users,
  Phone,
  MapPin,
  Radio,
  Server,
  Lock,
  Eye,
  EyeOff,
  Filter,
} from 'lucide-react';

interface CustomerRecord {
  id: number;
  customer_code: string;
  name: string;
  nik_masked: string;
  phone: string;
  email: string;
  address: string;
  service_type: string;
  server_name: string;
  pppoe_username: string;
  pppoe_password_masked: string;
  package_name: string;
  price: number;
  local_ip: string;
  remote_ip: string;
  rate_limit: string;
  subscribed_at: string;
  status: 'active' | 'pending' | 'suspended' | 'terminated';
  odp_name: string;
  odp_port: number;
  debt_amount: number;
  area: string;
}

const MOCK_CUSTOMERS: CustomerRecord[] = [
  {
    id: 101,
    customer_code: 'FM-CUST-8812',
    name: 'Bapak Hendra Gunawan',
    nik_masked: '3174**********02',
    phone: '081298812233',
    email: 'hendra.gun@gmail.com',
    address: 'Jl. Gandaria I No. 24, Kebayoran Baru',
    service_type: 'PPPoE',
    server_name: 'BRAS-JKT-SOUTH-01',
    pppoe_username: 'hendra_g@fibermedia',
    pppoe_password_masked: '••••••••',
    package_name: 'Fiber Fast 50 Mbps',
    price: 320000,
    local_ip: '10.20.0.1',
    remote_ip: '10.20.14.88',
    rate_limit: '50M/50M',
    subscribed_at: '2026-04-12',
    status: 'active',
    odp_name: 'ODP-KBY-01/08',
    odp_port: 3,
    debt_amount: 0,
    area: 'Jakarta Selatan - Kebayoran',
  },
  {
    id: 102,
    customer_code: 'FM-CUST-7421',
    name: 'Ibu Linda Kusumawardani',
    nik_masked: '3174**********05',
    phone: '081744556677',
    email: 'linda.k@gmail.com',
    address: 'Jl. Dharmawangsa X No. 5, Kebayoran Baru',
    service_type: 'PPPoE',
    server_name: 'BRAS-JKT-SOUTH-01',
    pppoe_username: 'linda_k@fibermedia',
    pppoe_password_masked: '••••••••',
    package_name: 'Fiber Pro 100 Mbps',
    price: 450000,
    local_ip: '10.20.0.1',
    remote_ip: '10.20.18.23',
    rate_limit: '100M/100M',
    subscribed_at: '2025-11-20',
    status: 'active',
    odp_name: 'ODP-KBY-02/16',
    odp_port: 7,
    debt_amount: 0,
    area: 'Jakarta Selatan - Kebayoran',
  },
  {
    id: 103,
    customer_code: 'FM-CUST-9102',
    name: 'Bapak Ahmad Faisal',
    nik_masked: '3174**********11',
    phone: '081211993344',
    email: 'faisal.ahmad@yahoo.com',
    address: 'Jl. Tebet Barat Dalam VII No. 14',
    service_type: 'PPPoE',
    server_name: 'BRAS-JKT-SOUTH-02',
    pppoe_username: 'afaisal@fibermedia',
    pppoe_password_masked: '••••••••',
    package_name: 'Fiber Pro 100 Mbps',
    price: 450000,
    local_ip: '10.21.0.1',
    remote_ip: '10.21.05.90',
    rate_limit: '100M/100M',
    subscribed_at: '2026-09-01',
    status: 'pending',
    odp_name: 'ODP-TBT-02/16',
    odp_port: 2,
    debt_amount: 0,
    area: 'Jakarta Selatan - Tebet',
  },
  {
    id: 104,
    customer_code: 'FM-CUST-6501',
    name: 'Dr. Bambang Setiadi',
    nik_masked: '3174**********89',
    phone: '081599887711',
    email: 'bambang.dr@gmail.com',
    address: 'Jl. Wijaya II No. 80, Kebayoran Baru',
    service_type: 'PPPoE',
    server_name: 'BRAS-JKT-SOUTH-01',
    pppoe_username: 'bambang_s@fibermedia',
    pppoe_password_masked: '••••••••',
    package_name: 'Fiber Ultra 200 Mbps',
    price: 680000,
    local_ip: '10.20.0.1',
    remote_ip: '10.20.02.11',
    rate_limit: '200M/200M',
    subscribed_at: '2025-08-15',
    status: 'active',
    odp_name: 'ODP-KBY-02/16',
    odp_port: 9,
    debt_amount: 0,
    area: 'Jakarta Selatan - Kebayoran',
  },
];

interface CustomerDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerDirectoryModal: React.FC<CustomerDirectoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);

  if (!isOpen) return null;

  const filtered = MOCK_CUSTOMERS.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.customer_code.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.odp_name.toLowerCase().includes(q) ||
      c.pppoe_username.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Data Pelanggan & Register Jaringan</h2>
              <p className="text-[11px] text-slate-400">Database 35 Kolom Pelanggan Fibermedia</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari ID Pelanggan, Nama, Telepon, Username PPPoE, ODP..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {/* Body List & Details */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
          {selectedCustomer ? (
            /* 35-Column Detail Card */
            <div className="space-y-3">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
              >
                &larr; Kembali ke Daftar Pelanggan
              </button>

              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                  <div>
                    <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                      {selectedCustomer.customer_code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{selectedCustomer.name}</h3>
                    <p className="text-slate-500 text-xs">{selectedCustomer.address}</p>
                  </div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full uppercase text-[10px] ${
                      selectedCustomer.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedCustomer.status}
                  </span>
                </div>

                {/* 35 Column Key Parameters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">TELEPON / WA</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.phone}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">NIK TERSAMAR</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.nik_masked}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">TIPE LAYANAN</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.service_type}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">USERNAME PPPoE</span>
                    <span className="font-bold text-sky-700">{selectedCustomer.pppoe_username}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">PASSWORD PPPoE</span>
                    <span className="text-slate-500">{selectedCustomer.pppoe_password_masked} (Terenkripsi)</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">SERVER BRAS</span>
                    <span className="font-bold text-slate-900">{selectedCustomer.server_name}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">MASTER ODP</span>
                    <span className="font-bold text-indigo-700">{selectedCustomer.odp_name}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">PORT ODP</span>
                    <span className="font-bold text-indigo-700">Port #{selectedCustomer.odp_port}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">RATE LIMIT</span>
                    <span className="font-bold text-emerald-700">{selectedCustomer.rate_limit}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">IP REMOTE</span>
                    <span className="font-bold text-slate-800">{selectedCustomer.remote_ip}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">HARGA BERLANGGANAN</span>
                    <span className="font-bold text-slate-800">Rp {selectedCustomer.price.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-sans text-[10px] text-slate-400 block font-semibold">HUTANG SAAT INI</span>
                    <span className="font-bold text-emerald-700">Rp {selectedCustomer.debt_amount}</span>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <a
                    href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Kirim Pesan WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ) : (
            filtered.map((cust) => (
              <div
                key={cust.id}
                onClick={() => setSelectedCustomer(cust)}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-700 text-xs">
                      {cust.customer_code}
                    </span>
                    <span className="font-bold text-slate-900">{cust.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {cust.package_name} · {cust.odp_name} (Port {cust.odp_port})
                  </p>
                  <p className="text-[10px] text-slate-400 truncate max-w-xs">{cust.address}</p>
                </div>

                <div className="text-right">
                  <span
                    className={`font-bold px-2 py-0.5 rounded-full uppercase text-[10px] ${
                      cust.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {cust.status}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-mono mt-1">
                    {cust.pppoe_username}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
