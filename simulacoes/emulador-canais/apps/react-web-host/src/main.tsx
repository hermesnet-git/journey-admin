import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@elastic-journey/renderer-react-web-mistica/styles.css';
import './styles.css';
import { App } from './App.js';

const root = document.getElementById('root');
if (!root) throw new Error('Elemento #root não encontrado.');

createRoot(root).render(<StrictMode><App /></StrictMode>);

