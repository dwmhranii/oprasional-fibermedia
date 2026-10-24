import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './dialog';
import { Button } from './button';
import { ExternalLink, Download } from 'lucide-react';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Pratinjau Dokumen'
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error state when modal opens or URL changes
  useEffect(() => {
    if (isOpen) {
      setHasError(false);
    }
  }, [isOpen, imageUrl]);

  if (!imageUrl) return null;

  const isPdf = imageUrl.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 bg-white">
        <DialogHeader className="mb-2 flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="hidden">Pratinjau dokumen</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 relative bg-gray-100 rounded-md overflow-hidden flex items-center justify-center border">
          {isPdf ? (
            <iframe
              src={imageUrl}
              title={title}
              className="w-full h-[60vh] border-0"
              loading="lazy"
            />
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center p-8 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <p className="text-sm font-medium">Gagal memuat pratinjau dokumen.</p>
            </div>
          ) : (
            <img 
              src={imageUrl} 
              alt={title} 
              className="max-w-full max-h-[70vh] object-contain"
              loading="lazy"
              onError={() => setHasError(true)}
            />
          )}
        </div>
        
        <div className="flex justify-end gap-2 mt-4 flex-shrink-0">
          <Button variant="outline" onClick={() => window.open(imageUrl, '_blank')}>
            <ExternalLink className="w-4 h-4 mr-2" /> Buka di Tab Baru
          </Button>
          <a href={imageUrl} download>
            <Button>
              <Download className="w-4 h-4 mr-2" /> Unduh File
            </Button>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

