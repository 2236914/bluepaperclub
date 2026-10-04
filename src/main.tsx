import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './design/tokens.css';
import './design/monari.css';
import './design/portal.css';
import './design/areas/customer.css';
import './design/areas/form.css';
import './design/areas/help.css';
import './design/areas/staff.css';
import './design/areas/staffOrder.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
