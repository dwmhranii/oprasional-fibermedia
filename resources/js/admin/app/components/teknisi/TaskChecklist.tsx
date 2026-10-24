import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Button } from '../ui/button';
import { Loader2, CheckCircle, AlertCircle, Save } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

interface ChecklistItem {
  id?: number;
  item_name: string;
  is_completed: boolean;
}

interface TaskChecklistProps {
  taskId: number;
  task: any;
  disabled?: boolean;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { item_name: 'Pemasangan Kabel Drop Core & ODP Port', is_completed: true },
  { item_name: 'Sinyal Redaman Fiber Optik (dBm)', is_completed: true },
  { item_name: 'Konfigurasi PPPoE Modem ONT/ONU', is_completed: true },
  { item_name: 'Pengujian Speedtest & Sinyal WiFi', is_completed: true },
  { item_name: 'Penyerahan Perangkat & Edukasi Pelanggan', is_completed: true },
];

export const TaskChecklist: React.FC<TaskChecklistProps> = ({ taskId, task, disabled }) => {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

  // Read explicitly from current_assignment.evidence.checklist_result
  const assignmentChecklist = task?.current_assignment?.evidence?.checklist_result || task?.evidence?.checklist_result || [];

  // Sync state with fetched data
  useEffect(() => {
    if (assignmentChecklist && Array.isArray(assignmentChecklist) && assignmentChecklist.length > 0) {
      setItems(assignmentChecklist.map((item: any) => ({
        item_name: item.item_name || item.name || '',
        is_completed: item.is_completed !== undefined ? !!item.is_completed : true,
      })));
    } else {
      setItems(DEFAULT_CHECKLIST);
    }
  }, [JSON.stringify(assignmentChecklist)]);

  // Mutation to save checklist
  const mutation = useMutation({
    mutationFn: async (updatedItems: ChecklistItem[]) => {
      // Format payload according to backend validation: { items: [ { item_name, is_completed } ] }
      const payload = {
        items: updatedItems.map(i => ({ item_name: i.item_name, is_completed: !!i.is_completed }))
      };
      const response = await apiClient.put<any>(`/teknisi/tasks/${taskId}/checklist`, payload);
      return response?.data ?? response;
    },
    onSuccess: (responseData) => {
      toast.success('Checklist instalasi berhasil disimpan!');
      // Update cache with response data
      if (responseData?.data) {
        setItems(responseData.data);
      }
      queryClient.invalidateQueries({ queryKey: ['tasks', 'detail', String(taskId)] });
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'checklist'] });
    },
    onError: (err: any) => {
      const message = err.response?.data?.message || err.message || 'Gagal menyimpan checklist';
      toast.error(message);
    }
  });

  const handleToggle = (index: number, checked: boolean) => {
    const newItems = [...items];
    newItems[index].is_completed = checked;
    setItems(newItems);
  };

  const handleSave = () => {
    mutation.mutate(items);
  };

  const allCompleted = items.length > 0 && items.every(i => i.is_completed);
  const hasChanges = JSON.stringify(items) !== JSON.stringify(assignmentChecklist);

  return (
    <Card className={`border ${allCompleted ? 'border-green-200 bg-green-50/10' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            Checklist Pemasangan Standar (SOP)
            {allCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
          </div>
        </CardTitle>
        <CardDescription>Pastikan seluruh SOP pemasangan ONT/Modem dan penarikan kabel telah diselesaikan.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-6 text-gray-500 italic">Checklist tidak tersedia untuk tugas ini.</div>
        ) : (
          <div className="space-y-1">
            {items.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Checkbox 
                  id={`checklist-${idx}`} 
                  checked={item.is_completed}
                  onCheckedChange={(checked) => handleToggle(idx, checked as boolean)}
                  disabled={disabled || mutation.isPending}
                  className="mt-0.5"
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor={`checklist-${idx}`}
                    className={`text-sm font-medium leading-none cursor-pointer ${item.is_completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}
                  >
                    {item.item_name}
                  </label>
                </div>
              </div>
            ))}
            
            <div className="pt-4 mt-2 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {items.filter(i => i.is_completed).length} dari {items.length} Selesai
              </span>
              <Button 
                type="button" 
                size="sm" 
                onClick={handleSave} 
                disabled={disabled || mutation.isPending || !hasChanges}
                className={hasChanges ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
              >
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Simpan Checklist</>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
