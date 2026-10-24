import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { DocumentItem } from '../../types';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Check, X, Loader2, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ImagePreviewModal } from '../ui/ImagePreviewModal';

interface DocumentReviewCardProps {
  document: DocumentItem | any;
  title: string;
  description: string;
  submissionId: string;
  disabled?: boolean;
}

export const DocumentReviewCard: React.FC<DocumentReviewCardProps> = ({ 
  document, 
  title, 
  description, 
  submissionId,
  disabled 
}) => {
  const queryClient = useQueryClient();
  const [isReviewing, setIsReviewing] = useState(false);
  const [notes, setNotes] = useState(document?.notes || '');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async ({ status, reviewNotes }: { status: 'approved' | 'rejected', reviewNotes: string }) => {
      const response = await apiClient.put<any>(`/admin/documents/${document.id}/review`, {
        status,
        review_notes: reviewNotes
      });
      return response?.data ?? response;
    },
    onSuccess: () => {
      toast.success(`Dokumen ${title} berhasil ditinjau`);
      setIsReviewing(false);
      queryClient.invalidateQueries({ queryKey: ['adminSubmissions', 'detail', submissionId] });
      queryClient.invalidateQueries({ queryKey: ['submission', submissionId] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || 'Gagal meninjau dokumen';
      toast.error(message);
    }
  });

  if (!document || !document.url) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 flex flex-col justify-between h-32 opacity-50">
        <div>
          <h4 className="font-semibold text-sm text-gray-700">{title}</h4>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        <p className="text-xs text-gray-400 italic">Belum diunggah</p>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (document.status) {
      case 'approved': return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1"/> Diterima</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 border-red-200"><AlertCircle className="w-3 h-3 mr-1"/> Ditolak</Badge>;
      default: return <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">Pending</Badge>;
    }
  };

  return (
    <div className={`border rounded-lg p-4 bg-white flex flex-col gap-3 transition-all ${document.status === 'rejected' ? 'border-red-300' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-semibold text-sm text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        </div>
        {getStatusBadge()}
      </div>

      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center bg-indigo-50 px-2 py-1 rounded"
        >
          <FileText className="w-3 h-3 mr-1" />
          Buka Dokumen &#x2197;
        </button>
      </div>

      {document.notes && !isReviewing && (
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border mt-1">
          <strong>Catatan:</strong> {document.notes}
        </div>
      )}

      {!isReviewing ? (
        <div className="pt-2 border-t mt-auto flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs h-7 px-2"
            disabled={disabled}
            onClick={() => setIsReviewing(true)}
          >
            Tinjau Dokumen
          </Button>
        </div>
      ) : (
        <div className="pt-2 border-t mt-auto space-y-2">
          <Textarea 
            placeholder="Catatan peninjauan (opsional, wajib jika ditolak)" 
            className="text-xs min-h-[60px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={mutation.isPending || disabled}
          />
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7"
              onClick={() => setIsReviewing(false)}
              disabled={mutation.isPending}
            >
              Batal
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs h-7 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => mutation.mutate({ status: 'rejected', reviewNotes: notes })}
              disabled={mutation.isPending || disabled || (notes.trim().length === 0)}
              title={notes.trim().length === 0 ? "Catatan wajib diisi untuk menolak dokumen" : ""}
            >
              {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3 mr-1" />}
              Tolak
            </Button>
            <Button 
              size="sm" 
              className="text-xs h-7 bg-green-600 hover:bg-green-700"
              onClick={() => mutation.mutate({ status: 'approved', reviewNotes: notes })}
              disabled={mutation.isPending || disabled}
            >
              {mutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
              Terima
            </Button>
          </div>
        </div>
      )}

      <ImagePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        imageUrl={document.url}
        title={`Pratinjau ${title}`}
      />
    </div>
  );
};
