import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom'


const container = document.getElementById('root');
const tree = (
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

const wasPrerendered = container.firstElementChild !== null;

if (wasPrerendered) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
