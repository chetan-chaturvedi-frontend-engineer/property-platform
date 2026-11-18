import { setupWorker } from 'msw/browser';

import { handlers } from '../handlers';

/** Development only (`npm run dev:mock`): answers API calls in the browser. */
export const worker = setupWorker(...handlers);
