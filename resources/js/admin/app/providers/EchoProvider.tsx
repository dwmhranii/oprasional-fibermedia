import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '../lib/api';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Setup Pusher globally
(window as any).Pusher = Pusher;

interface EchoContextType {
  echo: Echo<any> | null;
}

const EchoContext = createContext<EchoContextType | undefined>(undefined);

export const useEcho = () => {
  const context = useContext(EchoContext);
  if (context === undefined) {
    throw new Error('useEcho must be used within an EchoProvider');
  }
  return context;
};

interface EchoProviderProps {
  children: ReactNode;
}

export const EchoProvider: React.FC<EchoProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [echoInstance, setEchoInstance] = useState<Echo<any> | null>(null);

  useEffect(() => {
    let echo: Echo<any> | null = null;

    if (isAuthenticated && user) {
      const env = (import.meta as any).env || {};
      const broadcastDriver = env.VITE_BROADCAST_DRIVER || (env.VITE_PUSHER_APP_KEY ? 'pusher' : 'reverb');
      const pusherKey = env.VITE_PUSHER_APP_KEY;
      const reverbKey = env.VITE_REVERB_APP_KEY;

      const isPusher = broadcastDriver === 'pusher' && !!pusherKey;
      const isReverb = broadcastDriver === 'reverb' && !!reverbKey;

      if (!isPusher && !isReverb) {
        console.warn('Realtime broadcasting is disabled: Neither Pusher nor Reverb credentials configured.');
      } else {
        try {
          const authorizer = (channel: any) => ({
            authorize: (socketId: string, callback: (error: any, data?: any) => void) => {
              apiClient.post<any>('/broadcasting/auth', {
                socket_id: socketId,
                channel_name: channel.name
              })
              .then((response: any) => {
                callback(false, response?.data ?? response);
              })
              .catch((error: any) => {
                callback(true, error);
              });
            }
          });

          if (isPusher) {
            echo = new Echo<any>({
              broadcaster: 'pusher',
              key: pusherKey,
              cluster: env.VITE_PUSHER_APP_CLUSTER || 'ap1',
              forceTLS: true,
              authorizer,
            });
          } else {
            // Reverb (local development)
            echo = new Echo<any>({
              broadcaster: 'reverb',
              key: reverbKey,
              wsHost: env.VITE_REVERB_HOST || window.location.hostname,
              wsPort: env.VITE_REVERB_PORT ? Number(env.VITE_REVERB_PORT) : undefined,
              wssPort: env.VITE_REVERB_PORT ? Number(env.VITE_REVERB_PORT) : undefined,
              forceTLS: env.VITE_REVERB_SCHEME === 'https',
              enabledTransports: ['ws', 'wss'],
              authorizer,
            });
          }

          setEchoInstance(echo);

      // --- Channel Subscriptions based on Role ---
      const hasRole = (role: string) => user.roles?.some(r => r.toLowerCase() === role.toLowerCase());

      // Admins & Superadmins
      if (hasRole('Admin') || hasRole('Superadmin')) {
        echo.private('admins')
          .listen('.submission.created', (e: any) => {
            queryClient.invalidateQueries({ queryKey: ['submissions'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.info('Ada pengajuan baru yang masuk!', {
              description: `Pengajuan ID: ${e.submissionId}`
            });
          })
          .listen('.task.completed', (e: any) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Pemasangan Selesai!', {
              description: `Tugas ${e.taskNumber} telah diselesaikan oleh teknisi.`
            });
          })
          .listen('.provisioning.completed', (e: any) => {
            queryClient.invalidateQueries({ queryKey: ['provisionings'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Provisioning Selesai!', {
              description: `Provisioning ID: ${e.provisioningId} aktif.`
            });
          })
          .listen('.complaint.resolved', (e: any) => {
            queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
            toast.success('Pekerjaan Teknisi Selesai!', {
              description: `Tiket ${e.ticket_number || e.complaintId || ''} siap diverifikasi bukti pengerjaannya.`
            });
          })
          .listen('.complaint.created', () => {
            queryClient.invalidateQueries({ queryKey: ['adminComplaints'] });
          });
      }

      // Sales
      if (hasRole('Sales')) {
        echo.private(`sales.${user.id}`)
          .listen('.submission.approved', (e: any) => {
            queryClient.invalidateQueries({ queryKey: ['submissions'] });
            queryClient.invalidateQueries({ queryKey: ['submission', e.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Pengajuan Anda Disetujui!', {
              description: `Pengajuan ID: ${e.submissionId} diterima oleh Admin.`
            });
          })
          .listen('.submission.rejected', (e: any) => {
            queryClient.invalidateQueries({ queryKey: ['submissions'] });
            queryClient.invalidateQueries({ queryKey: ['submission', e.submissionId] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.error('Pengajuan Butuh Perhatian!', {
              description: `Pengajuan ID: ${e.submissionId} butuh perbaikan.`
            });
          });
      }

      // Technician
      if (hasRole('Teknisi')) {
        echo.private(`technician.${user.id}`)
          .listen('.task.assigned', (e: any) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.info('Tugas Baru Diberikan!', {
              description: `Tugas ${e.taskNumber} telah ditugaskan ke Anda.`
            });
          })
          .listen('.complaint.assigned', (e: any) => {
            queryClient.invalidateQueries({ queryKey: ['teknisiComplaints'] });
            toast.info('Pengaduan Baru Ditugaskan!', {
              description: `Tiket ${e.ticket_number || e.complaintId || ''} ditugaskan kepada Anda.`
            });
          })
          .listen('.complaint.returned', (e: any) => {
            queryClient.invalidateQueries({ queryKey: ['teknisiComplaints'] });
            toast.warning('Tiket Pengaduan Dikembalikan!', {
              description: `Tiket ${e.ticket_number || e.complaintId || ''} membutuhkan perbaikan bukti/pekerjaan.`
            });
          });
      }

      // Generic User (for document reviews, though usually handled by Sales role logic)
      echo.private(`App.Models.User.${user.id}`)
        .listen('.document.reviewed', (e: any) => {
          queryClient.invalidateQueries({ queryKey: ['submission', e.submission_id] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          toast.info('Dokumen Ditinjau!', {
            description: `Dokumen ID: ${e.document_id} untuk pengajuan ${e.submission_id} telah ditinjau.`
          });
        });
        
      // Fallback for user.id just in case DocumentReviewed broadcasts exactly to `user.{id}` as audited
      echo.private(`user.${user.id}`)
        .listen('.document.reviewed', (e: any) => {
          queryClient.invalidateQueries({ queryKey: ['submission', e.submission_id] });
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          toast.info('Dokumen Ditinjau!', {
            description: `Dokumen pada pengajuan ${e.submission_id} telah ditinjau.`
          });
        });
        } catch (error) {
          console.error('Failed to initialize Reverb/Echo:', error);
        }
      }
    }

    // Cleanup function: Leave channels and disconnect on unmount or user change
    return () => {
      if (echo) {
        if (user) {
          const hasRole = (role: string) => user.roles?.some(r => r.toLowerCase() === role.toLowerCase());
          if (hasRole('Admin') || hasRole('Superadmin')) {
            echo.leave('admins');
          }
          if (hasRole('Sales')) {
            echo.leave(`sales.${user.id}`);
          }
          if (hasRole('Teknisi')) {
            echo.leave(`technician.${user.id}`);
          }
          echo.leave(`App.Models.User.${user.id}`);
          echo.leave(`user.${user.id}`);
        }
        echo.disconnect();
      }
    };
  }, [isAuthenticated, user, queryClient]);

  return (
    <EchoContext.Provider value={{ echo: echoInstance }}>
      {children}
    </EchoContext.Provider>
  );
};
