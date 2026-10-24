import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, X, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { CameraModal, checkCameraAvailability } from './CameraModal';
import { toast } from 'sonner';

interface MediaUploadProps {
  label?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  required?: boolean;
  error?: string;
  maxSizeMB?: number;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  label,
  file,
  onFileChange,
  required = false,
  error,
  maxSizeMB = 5,
}) => {
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      onFileChange(selected);
    }
    // reset input
    e.target.value = '';
  };

  const handleCameraClick = async () => {
    const result = await checkCameraAvailability();
    if (result.permissionGranted) {
      setIsCameraModalOpen(true);
    } else if (result.error === 'PERMISSION_DENIED') {
      toast.error("Akses kamera ditolak. Silakan izinkan akses kamera pada browser.");
    } else {
      toast.info("Kamera tidak ditemukan. Membuka pemilih file...");
      fileInputRef.current?.click();
    }
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleRemove = () => {
    onFileChange(null);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Hidden inputs */}
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
      />

      <div className={`border rounded-lg p-4 transition-colors ${error ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
        {!file ? (
          <div className="flex flex-col space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="w-full flex flex-col items-center justify-center py-6 h-auto border-dashed hover:border-primary hover:bg-primary/5" onClick={handleCameraClick}>
                <Camera className="w-6 h-6 mb-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Ambil Foto</span>
              </Button>
              <Button type="button" variant="outline" className="w-full flex flex-col items-center justify-center py-6 h-auto border-dashed hover:border-primary hover:bg-primary/5" onClick={handleGalleryClick}>
                <ImageIcon className="w-6 h-6 mb-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Pilih File</span>
              </Button>
            </div>
            <div className="text-xs text-center text-gray-500">
              Format: JPG, PNG • Max: {maxSizeMB}MB
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-3">
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border">
              {preview && (
                <img src={preview} alt="Preview" className="w-full h-full object-contain" />
              )}
              <div className="absolute top-2 right-2 flex space-x-1">
                <Button type="button" variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-sm bg-white hover:bg-gray-100" onClick={handleGalleryClick}>
                  <RefreshCw className="w-4 h-4 text-gray-700" />
                </Button>
                <Button type="button" variant="destructive" size="icon" className="h-8 w-8 rounded-full shadow-sm" onClick={handleRemove}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-sm font-medium text-green-600 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Uploaded
              </span>
              <span className="text-xs text-gray-500 truncate max-w-[150px]" title={file.name}>
                {file.name}
              </span>
            </div>
          </div>
        )}
      </div>

      <CameraModal 
        isOpen={isCameraModalOpen} 
        onClose={() => setIsCameraModalOpen(false)} 
        onCapture={(file) => {
          onFileChange(file);
        }} 
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};
