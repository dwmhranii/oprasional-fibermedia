import React from 'react';
import { createRoot } from 'react-dom/client';
import FieldApp from './App';
import '../admin/styles/index.css';

const container = document.getElementById('field-root');
if (container) {
  const root = createRoot(container);
  root.render(<FieldApp />);
}
