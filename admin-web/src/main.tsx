import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';

import '@/styles/index.css';

async function enableMocks(): Promise<void> {
  // Read directly (not via config/env) so Vite replaces these with constants and production
  // builds drop the mock code entirely. Same rule as env.enableMocks.
  const mocksEnabled =
    import.meta.env.VITE_ENABLE_MOCKS === 'true' ||
    (import.meta.env.MODE === 'mock' && import.meta.env.VITE_ENABLE_MOCKS !== 'false');
  if (!mocksEnabled) {
    return;
  }
  const { worker } = await import('@/tests/mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found');
}

void enableMocks().then(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
