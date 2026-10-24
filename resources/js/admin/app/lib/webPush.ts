import { apiClient } from './api';

/**
 * Utility to convert base64 VAPID public key to Uint8Array required by pushManager.subscribe
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if browser supports Web Push API and Service Workers
 */
export const isWebPushSupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
};

/**
 * Get current notification permission
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isWebPushSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Fetch VAPID public key from env or backend
 */
export const getVapidPublicKey = async (): Promise<string | null> => {
  const envKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;

  try {
    const res = await apiClient.get<any>('/push-subscriptions/vapid-key');
    return res?.publicKey || res?.data?.publicKey || null;
  } catch (error) {
    console.error('Failed to retrieve VAPID public key:', error);
    return null;
  }
};

/**
 * Check if the current device/browser is already subscribed
 */
export const isCurrentDeviceSubscribed = async (): Promise<boolean> => {
  if (!isWebPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (e) {
    console.warn('Error checking push subscription:', e);
    return false;
  }
};

/**
 * Subscribe the current device to Web Push notifications
 */
export const subscribeToWebPush = async (): Promise<{ success: boolean; message: string }> => {
  if (!isWebPushSupported()) {
    return { success: false, message: 'Browser ini tidak mendukung Web Push Notifications.' };
  }

  try {
    // 1. Request notification permission from user
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, message: 'Izin notifikasi ditolak oleh pengguna.' };
    }

    // 2. Get VAPID public key
    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      return { success: false, message: 'VAPID public key tidak ditemukan.' };
    }

    // 3. Register push subscription with the browser's push service (Google/Apple/Mozilla)
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as any,
      });
    }

    // 4. Send subscription data to Laravel backend
    const subJson = subscription.toJSON();
    await apiClient.post('/push-subscriptions', {
      endpoint: subJson.endpoint,
      keys: {
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      },
      content_encoding: 'aesgcm',
    });

    return { success: true, message: 'Notifikasi HP berhasil diaktifkan!' };
  } catch (error: any) {
    console.error('Failed to subscribe to Web Push:', error);
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Gagal mengaktifkan notifikasi.',
    };
  }
};

/**
 * Unsubscribe the current device from Web Push
 */
export const unsubscribeFromWebPush = async (): Promise<{ success: boolean; message: string }> => {
  if (!isWebPushSupported()) {
    return { success: false, message: 'Browser tidak mendukung Web Push.' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Inform backend
      await apiClient.delete('/push-subscriptions', {
        data: { endpoint },
      });
    }

    return { success: true, message: 'Notifikasi HP berhasil dimatikan.' };
  } catch (error: any) {
    console.error('Failed to unsubscribe from Web Push:', error);
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Gagal mematikan notifikasi.',
    };
  }
};

/**
 * Send a test push notification to verify lock screen arrival
 */
export const sendTestPushNotification = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await apiClient.post<any>('/push-subscriptions/test');
    return { success: true, message: res?.message || res?.data?.message || 'Notifikasi tes terkirim!' };
  } catch (error: any) {
    return {
      success: false,
      message: error?.response?.data?.message || error?.message || 'Gagal mengirim tes notifikasi.',
    };
  }
};
