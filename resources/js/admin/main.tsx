import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";

// Admin TIDAK mendaftarkan service worker.
// Saat admin dimuat, batalkan pendaftaran service worker lama yang scope-nya mencakup akar (bila ada) dan hapus cache lama non-PWA.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      if (!reg.scope.includes('/pwa/')) {
        reg.unregister().catch(() => {});
      }
    }
  }).catch(() => {});
}

if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((keys) => {
    for (const key of keys) {
      if (!key.startsWith('fm-pwa-')) {
        caches.delete(key).catch(() => {});
      }
    }
  }).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);