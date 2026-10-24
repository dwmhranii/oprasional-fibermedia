// Service Worker Push Notification Handler
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Notifikasi Fibermedia', body: event.data.text() };
    }
  }

  const title = data.title || 'Tugas Baru Diberikan!';
  const options = {
    body: data.body || 'Ada tugas baru yang ditugaskan ke Anda.',
    icon: data.icon || '/logo-fibermedia.png',
    badge: data.badge || '/logo-fibermedia.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'fibermedia-task-notification',
    renotify: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Buka Tugas' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(targetUrl) || targetUrl === '/') {
            return client.focus();
          }
        }
      }
      // Or open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
