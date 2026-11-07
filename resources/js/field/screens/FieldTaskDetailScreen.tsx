import React, { useState } from 'react';
import {
  TicketStepper,
  TicketStepKey,
  Button,
  StatusBadge,
  SlaBadge,
  SignalIndicator,
  Badge,
} from '@shared/ui';
import {
  Phone,
  MapPin,
  Radio,
  ArrowLeft,
  Navigation,
  FileCheck,
  CheckCircle2,
  Wrench,
  ArrowRight,
} from 'lucide-react';

export interface FieldTaskDetailScreenProps {
  task?: {
    id: string;
    ticketNumber: string;
    title: string;
    customerName: string;
    phone: string;
    address: string;
    odpCode: string;
    portNumber: number;
    initialStep?: TicketStepKey;
  };
  onBack: () => void;
  onProceedToBast: () => void;
}

export const FieldTaskDetailScreen: React.FC<FieldTaskDetailScreenProps> = ({
  task = {
    id: 'task-1',
    ticketNumber: 'TKT-2026-0914',
    title: 'Kabel Dropcore Putus Tertimpa Pohon',
    customerName: 'Bambang Sudiro',
    phone: '0812-3456-7890',
    address: 'Jl. Danau Toba No. 12, Sawojajar, Malang',
    odpCode: 'ODP-SWJ-02/01',
    portNumber: 3,
    initialStep: 'in_progress',
  },
  onBack,
  onProceedToBast,
}) => {
  const [currentStep, setCurrentStep] = useState<TicketStepKey>(
    task.initialStep || 'on_the_way'
  );
  const [timestamps, setTimestamps] = useState<Partial<Record<TicketStepKey, string>>>({
    assigned: '08:15 WIB',
    on_the_way: '08:35 WIB',
  });
  const [isLoading, setIsLoading] = useState(false);

  // Single primary action button behavior
  const handlePrimaryAction = () => {
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (currentStep === 'assigned') {
        setCurrentStep('on_the_way');
        setTimestamps((prev) => ({ ...prev, on_the_way: '08:45 WIB' }));
      } else if (currentStep === 'on_the_way') {
        setCurrentStep('in_progress');
        setTimestamps((prev) => ({ ...prev, in_progress: '09:05 WIB' }));
      } else if (currentStep === 'in_progress') {
        onProceedToBast();
      }
    }, 400);
  };

  const getPrimaryButtonConfig = () => {
    switch (currentStep) {
      case 'assigned':
        return {
          label: 'Mulai Perjalanan ke Lokasi',
          icon: <Navigation className="w-5 h-5" />,
          variant: 'primary' as const,
        };
      case 'on_the_way':
        return {
          label: 'Tiba & Mulai Pengerjaan',
          icon: <Wrench className="w-5 h-5" />,
          variant: 'primary' as const,
        };
      case 'in_progress':
        return {
          label: 'Buat BAST & Selesaikan Tugas',
          icon: <FileCheck className="w-5 h-5" />,
          variant: 'primary' as const,
        };
      case 'completed':
        return {
          label: 'Tugas Selesai',
          icon: <CheckCircle2 className="w-5 h-5" />,
          variant: 'secondary' as const,
        };
    }
  };

  const buttonConfig = getPrimaryButtonConfig();

  return (
    <div className="space-y-4">
      {/* Top Navigation Back */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          density="comfortable"
          onClick={onBack}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Kembali ke Daftar
        </Button>

        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-md">
          #{task.ticketNumber}
        </span>
      </div>

      {/* Ticket Stepper Card */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs">
        <TicketStepper currentStep={currentStep} timestamps={timestamps} />
      </div>

      {/* Task Summary Card */}
      <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-foreground tracking-tight">
              {task.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Work Order Pengaduan Gangguan Fisik
            </p>
          </div>

          <SlaBadge status="warning" timeText="00:18:40" size="sm" />
        </div>

        {/* Customer & Address Details */}
        <div className="p-3 rounded-xl bg-muted/40 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Pelanggan:</span>
            <span className="font-bold text-foreground">{task.customerName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Telepon:</span>
            <a
              href={`tel:${task.phone}`}
              className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>{task.phone}</span>
            </a>
          </div>

          <div className="flex items-start justify-between pt-1 border-t border-border/60">
            <span className="text-muted-foreground shrink-0 mt-0.5">Alamat:</span>
            <span className="text-right text-foreground font-medium pl-3">
              {task.address}
            </span>
          </div>
        </div>

        {/* ODP and Optical Signal Meter */}
        <div className="p-3 rounded-xl border border-border flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Radio className="w-3.5 h-3.5 text-primary" />
              <span>Titik Sambung:</span>
            </div>
            <p className="font-mono text-xs font-bold text-foreground">
              {task.odpCode} (Port {task.portNumber})
            </p>
          </div>

          <SignalIndicator dbm={-24.8} size="sm" />
        </div>
      </div>

      {/* Single Primary Action Button (Target sentuh min 48px / min-h-12) */}
      <div className="pt-2">
        <Button
          variant={buttonConfig.variant}
          size="lg"
          density="comfortable"
          isLoading={isLoading}
          disabled={currentStep === 'completed'}
          onClick={handlePrimaryAction}
          className="w-full min-h-12 text-base font-semibold shadow-md shadow-cyan-500/25"
          leftIcon={buttonConfig.icon}
        >
          {buttonConfig.label}
        </Button>
      </div>
    </div>
  );
};

