import React from 'react';
import { createRoot } from 'react-dom/client';

import './bootstrap';
import '../css/app.css';
import './styles/main.css';

import App from './App';

const container = document.getElementById('root');

if (container) {
    createRoot(container).render(<App />);
}
