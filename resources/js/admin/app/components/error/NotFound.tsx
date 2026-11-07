import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { FileQuestion, Users, LayoutDashboard } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background text-foreground">
      <FileQuestion className="w-24 h-24 text-muted-foreground mb-6" />
      <h1 className="text-4xl font-bold mb-2">Halaman Tidak Ditemukan</h1>
      <p className="text-lg text-muted-foreground mb-8 text-center max-w-md">
        Halaman yang Anda tuju tidak ada atau telah dipindahkan.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button 
          onClick={() => navigate('/dashboard')}
          className="h-12 px-6 text-base flex items-center gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          Kembali ke Dashboard
        </Button>
        <Button 
          variant="outline"
          onClick={() => navigate('/customers')}
          className="h-12 px-6 text-base flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Buka Halaman Pelanggan
        </Button>
      </div>
    </div>
  );
};
