import React, { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  FileText, 
  ShieldCheck, 
  Wrench, 
  UserCheck, 
  Copy, 
  Check, 
  ArrowRight,
  Link2,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { Submission } from '../../types';

interface ServiceChainCardProps {
  submission: Submission;
  className?: string;
}

export const ServiceChainCard: React.FC<ServiceChainCardProps> = ({ submission, className = '' }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const chain = submission.serviceChain || submission.service_chain || {
    submission_number: submission.submissionNumber || submission.submission_number,
    provisioning_number: submission.provisioning?.provisioning_number,
    task_number: submission.task?.task_number || submission.taskId,
    customer_code: submission.customerCode || submission.customer_code || submission.nomor_pelanggan,
    status: submission.status,
    stage: submission.status === 'completed' ? 'Layanan Aktif (Selesai)' : 'Dalam Proses',
  };

  const handleCopy = (text: string, label: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`${label} disalin: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const steps = [
    {
      key: 'submission',
      title: '1. No. Pengajuan (Sales)',
      value: chain.submission_number,
      placeholder: 'Belum terbit',
      icon: FileText,
      color: '#3b82f6',
      bgLight: '#eff6ff',
      isCompleted: !!chain.submission_number,
      isActive: true,
    },
    {
      key: 'provisioning',
      title: '2. No. Validasi (Admin)',
      value: chain.provisioning_number,
      placeholder: 'Menunggu Validasi',
      icon: ShieldCheck,
      color: '#8b5cf6',
      bgLight: '#f5f3ff',
      isCompleted: !!chain.provisioning_number,
      isActive: !!chain.provisioning_number,
    },
    {
      key: 'task',
      title: '3. No. Work Order (Teknisi)',
      value: chain.task_number,
      placeholder: 'Menunggu Penugasan',
      icon: Wrench,
      color: '#f59e0b',
      bgLight: '#fffbeb',
      isCompleted: !!chain.task_number,
      isActive: !!chain.task_number,
    },
    {
      key: 'customer',
      title: '4. ID Pelanggan (Billing)',
      value: chain.customer_code,
      placeholder: 'Menunggu Aktivasi',
      icon: UserCheck,
      color: '#10b981',
      bgLight: '#ecfdf5',
      isCompleted: !!chain.customer_code,
      isActive: !!chain.customer_code,
      isFinal: true,
    },
  ];

  return (
    <Card className={`border shadow-sm overflow-hidden bg-gradient-to-r from-slate-50 via-white to-slate-50 ${className}`}>
      <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-sm tracking-wide">Rantai Pelacakan Layanan (Traceability Chain)</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-normal flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            {chain.stage || 'Siklus Layanan Terhubung'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const hasValue = !!step.value;

            return (
              <div
                key={step.key}
                className={`rounded-xl p-3.5 border transition-all flex flex-col justify-between ${
                  hasValue 
                    ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300' 
                    : 'bg-slate-50/70 border-dashed border-slate-200 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-xs"
                        style={{ backgroundColor: hasValue ? step.color : '#94a3b8' }}
                      >
                        {idx + 1}
                      </div>
                      {step.title.split('. ')[1] || step.title}
                    </span>
                    <Icon className="w-4 h-4" style={{ color: hasValue ? step.color : '#94a3b8' }} />
                  </div>

                  <div className="mt-1">
                    {hasValue ? (
                      <div className="flex items-center justify-between gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="font-mono text-xs font-bold text-slate-800 truncate" title={step.value}>
                          {step.value}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(step.value!, step.title, step.key)}
                          className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200/60 rounded transition-colors"
                          title="Salin nomor"
                        >
                          {copiedKey === step.key ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-slate-100/60 text-slate-400 text-xs italic font-medium">
                        {step.placeholder}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Status</span>
                  {hasValue ? (
                    <span className="font-medium text-emerald-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Terbit
                    </span>
                  ) : (
                    <span className="text-slate-400">Menunggu</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
