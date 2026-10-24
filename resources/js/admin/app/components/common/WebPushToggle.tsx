import React, { useEffect, useState } from 'react';
import { Smartphone, BellRing, Check, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import {
  isWebPushSupported,
  isCurrentDeviceSubscribed,
  subscribeToWebPush,
  unsubscribeFromWebPush,
  sendTestPushNotification,
} from '../../lib/webPush';

export const WebPushToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [isSupported, setIsSupported] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const supported = isWebPushSupported();
      setIsSupported(supported);
      if (supported) {
        const subscribed = await isCurrentDeviceSubscribed();
        setIsSubscribed(subscribed);
      }
    };
    checkStatus();
  }, []);

  if (!isSupported) {
    return null; // Don't show if browser doesn't support Web Push
  }

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      if (isSubscribed) {
        const res = await unsubscribeFromWebPush();
        if (res.success) {
          setIsSubscribed(false);
          toast.info(res.message);
        } else {
          toast.error(res.message);
        }
      } else {
        const res = await subscribeToWebPush();
        if (res.success) {
          setIsSubscribed(true);
          toast.success(res.message, {
            description: 'Anda akan menerima notifikasi tugas di layar kunci HP.',
          });
        } else {
          toast.error(res.message);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const res = await sendTestPushNotification();
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsTesting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700">
          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
          <span>Notifikasi HP (Lock Screen):</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isSubscribed ? (
            <>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                <Check className="w-3 h-3" /> Aktif
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={handleTest}
                disabled={isTesting}
              >
                {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Tes'}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[11px] font-medium text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={handleToggle}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Aktifkan'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-blue-50 text-blue-600">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Notifikasi Layar Kunci HP</h4>
          <p className="text-xs text-slate-500">
            Terima notifikasi tugas baru langsung di HP meskipun aplikasi ditutup.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isSubscribed && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={isTesting}
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4 mr-1" />}
            Tes HP
          </Button>
        )}
        <Button
          variant={isSubscribed ? 'secondary' : 'default'}
          size="sm"
          onClick={handleToggle}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSubscribed ? (
            'Matikan'
          ) : (
            'Aktifkan di HP'
          )}
        </Button>
      </div>
    </div>
  );
};
