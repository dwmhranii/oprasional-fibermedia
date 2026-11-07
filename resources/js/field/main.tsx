import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('field-root') || document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

// Daftarkan service worker PWA
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/pwa/sw.js', { scope: '/pwa/' }).catch(() => {
      navigator.serviceWorker.register('/sw.js', { scope: '/pwa/' }).catch(() => {});
    });
  });
}
