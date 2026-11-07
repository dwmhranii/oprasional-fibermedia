import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { PenTool, Eraser, Save, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerSignatureProps {
  taskId: number;
  existingSignatureUrl?: string;
  disabled?: boolean;
}

export const CustomerSignature: React.FC<CustomerSignatureProps> = ({ taskId, existingSignatureUrl, disabled }) => {
  const queryClient = useQueryClient();
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  const mutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const formData = new FormData();
      formData.append('signature', blob, 'signature.png');
      
      const response = await apiClient.upload<any>(`/tasks/${taskId}/upload-signature`, formData);
      return response;
    },
    onSuccess: () => {
      toast.success('Tanda tangan pelanggan berhasil disimpan!');
      // Invalidate task query to fetch updated customer_signature_path
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', String(taskId)] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || 'Gagal menyimpan tanda tangan';
      toast.error(message);
    }
  });

  const clearSignature = () => {
    sigCanvasRef.current?.clear();
    setHasDrawn(false);
  };

  const saveSignature = () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      toast.error('Silakan gambar tanda tangan terlebih dahulu.');
      return;
    }

    // Convert canvas to Blob
    const dataURL = sigCanvasRef.current.getCanvas().toDataURL('image/png');
    
    // Convert Base64 to Blob
    fetch(dataURL)
      .then(res => res.blob())
      .then(blob => {
        mutation.mutate(blob);
      });
  };

  const isSaving = mutation.isPending;

  return (
    <Card className={`border ${existingSignatureUrl ? 'border-green-200 bg-green-50/10' : 'border-gray-200 shadow-sm'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✍️</span> Tanda Tangan Pelanggan
          </div>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Pastikan pelanggan telah memeriksa hasil pemasangan sebelum menandatangani.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {existingSignatureUrl && !hasDrawn ? (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-xl bg-gray-50 p-4 flex justify-center items-center h-[240px] w-full">
              <img src={existingSignatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
            </div>
            
            <div className="w-full bg-green-50 border border-green-100 rounded-lg p-3 text-center mb-4">
              <p className="text-sm text-green-700 font-medium flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Tanda tangan berhasil disimpan
              </p>
            </div>

            <Button type="button" variant="outline" className="w-full min-h-[48px]" onClick={() => setHasDrawn(true)} disabled={disabled || isSaving}>
              <PenTool className="w-4 h-4 mr-2" /> Ubah Tanda Tangan
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 font-medium">Mintalah pelanggan menandatangani area di bawah ini.</p>
            
            <div className="relative border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 w-full h-[240px] touch-none">
              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-300">
                  <PenTool className="w-10 h-10 mb-2 opacity-30" />
                  <span className="text-sm font-medium">Area Tanda Tangan</span>
                </div>
              )}
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{
                  className: 'signature-canvas w-full h-full cursor-crosshair rounded-xl relative z-10',
                  style: { width: '100%', height: '100%' }
                }}
                onBegin={() => setHasDrawn(true)}
              />
            </div>

            <div className="flex flex-col gap-3 w-full pt-2">
              <Button 
                type="button" 
                onClick={saveSignature} 
                disabled={disabled || isSaving || !hasDrawn}
                className="w-full min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Simpan Tanda Tangan</>
                )}
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" className="w-full min-h-[44px]" onClick={clearSignature} disabled={disabled || isSaving || !hasDrawn}>
                  <Eraser className="w-4 h-4 mr-2" /> Hapus
                </Button>
                {existingSignatureUrl ? (
                  <Button type="button" variant="ghost" className="w-full min-h-[44px]" onClick={() => { sigCanvasRef.current?.clear(); setHasDrawn(false); }} disabled={disabled || isSaving}>
                    Batal
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" className="w-full min-h-[44px] opacity-0 pointer-events-none" disabled>
                    Batal
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
