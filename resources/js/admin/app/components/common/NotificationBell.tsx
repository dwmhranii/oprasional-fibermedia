import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { Notification } from '../../types/notification';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, FileText, Wrench, AlertTriangle, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { WebPushToggle } from './WebPushToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export const NotificationBell: React.FC = () => {
  const { notifications, isLoading, isError, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const getNormalizedType = (n: Notification) => {
    if (n.data?.type) return n.data.type;
    if (n.type) {
      const baseName = n.type.split('\\').pop() || '';
      return baseName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    }
    return '';
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'submission_created':
      case 'submission_validated':
        return <FileText className="w-4 h-4 text-blue-500 mt-1" />;
      case 'provisioning_completed':
        return <CheckCircle className="w-4 h-4 text-green-500 mt-1" />;
      case 'task_assigned':
      case 'technician_returned':
      case 'technician_approved':
        return <Wrench className="w-4 h-4 text-orange-500 mt-1" />;
      case 'sla_breach':
        return <AlertTriangle className="w-4 h-4 text-red-500 mt-1" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500 mt-1" />;
    }
  };

  const getRoute = (notification: Notification) => {
    const normType = getNormalizedType(notification);
    const { submission_id, provisioning_id, task_id, sla_id } = notification.data || {};
    switch (normType) {
      case 'submission_created':
      case 'submission_validated':
        return submission_id ? `/submissions/${submission_id}` : '/submissions';
      case 'provisioning_completed':
        return provisioning_id ? `/psb/${provisioning_id}` : '/psb';
      case 'task_assigned':
      case 'technician_returned':
      case 'technician_approved':
        return task_id ? `/work-orders/${task_id}` : '/work-orders';
      case 'sla_breach':
        return sla_id ? `/sla-breaches/${sla_id}` : '/sla-breaches';
      default:
        return null;
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead.mutateAsync(notification.id);
    }
    const route = getRoute(notification);
    if (route) {
      navigate(route);
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // in seconds

    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    return `${Math.floor(diff / 86400)} hr lalu`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-center justify-between px-4 py-2">
          <DropdownMenuLabel className="p-0 font-semibold text-gray-800 dark:text-slate-100">Notifikasi</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs text-blue-600 dark:text-indigo-400 hover:text-blue-800 dark:hover:text-indigo-300"
              onClick={(e) => {
                e.preventDefault();
                markAllAsRead.mutate();
              }}
              disabled={markAllAsRead.isPending}
            >
              <Check className="mr-1 w-3 h-3" />
              Tandai semua dibaca
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="dark:bg-slate-800" />
        <WebPushToggle compact={true} />
        
        <ScrollArea className="h-[350px] overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-slate-400">Memuat...</div>
          )}
          
          {isError && (
            <div className="p-4 text-center text-sm text-red-500 dark:text-red-400">Gagal memuat notifikasi.</div>
          )}

          {!isLoading && !isError && notifications.length === 0 && (
            <div className="p-8 text-center">
              <Bell className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Belum ada notifikasi</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Notifikasi baru akan muncul di sini</p>
            </div>
          )}

          {!isLoading && !isError && notifications.length > 0 && (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id}
                  className={`flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-gray-100 dark:focus:bg-slate-800/80 ${
                    !notification.read_at ? 'bg-blue-50/50 dark:bg-slate-800/60' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex w-full items-start gap-3">
                    <div className="shrink-0">{getIcon(getNormalizedType(notification))}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium leading-none ${!notification.read_at ? 'text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}>
                          {notification.data?.title || 
                           (getNormalizedType(notification) 
                             ? getNormalizedType(notification).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
                             : 'Notifikasi')}
                        </p>
                        <span className="shrink-0 text-[10px] text-gray-400 dark:text-slate-500">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>
                      <p className={`text-xs ${!notification.read_at ? 'text-gray-600 dark:text-slate-300' : 'text-gray-500 dark:text-slate-400'} line-clamp-2`}>
                        {notification.data?.message || 'Tidak ada detail pesan.'}
                      </p>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
