import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { ShieldAlert } from 'lucide-react';

export const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-6">
        <ShieldAlert className="w-16 h-16" />
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Akses Ditolak</h1>
      <p className="text-base text-muted-foreground mb-8 text-center max-w-md">
        Anda tidak memiliki izin untuk mengakses halaman ini. Silakan kembali ke dashboard atau hubungi administrator jika Anda memerlukan akses tambahan.
      </p>
      <Button 
        onClick={() => navigate('/admin')}
        className="h-11 px-6 text-sm font-medium"
      >
        Kembali ke Dashboard
      </Button>
    </div>
  );
};
