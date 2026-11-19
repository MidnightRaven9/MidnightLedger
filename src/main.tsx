import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { applyAccentColor, getAccentColor } from './utils/accentColor';
import './index.css';

// Apply the saved accent before the first paint so there is no flash of the default.
applyAccentColor(getAccentColor());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
