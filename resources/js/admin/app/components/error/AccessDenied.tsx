import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { ShieldAlert } from 'lucide-react';

export const AccessDenied = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <ShieldAlert className="w-24 h-24 text-red-500 mb-6" />
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Akses Ditolak</h1>
      <p className="text-lg text-gray-600 mb-8 text-center max-w-md">
        Anda tidak memiliki izin untuk mengakses halaman ini. Silakan kembali ke dashboard atau hubungi administrator jika ini adalah sebuah kesalahan.
      </p>
      <Button 
        onClick={() => navigate('/dashboard')}
        className="h-12 px-8 text-lg"
      >
        Kembali ke Dashboard
      </Button>
    </div>
  );
};
