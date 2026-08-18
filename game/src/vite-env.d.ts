/// <reference types="vite/client" />

import type { Tuning } from './tuning';

declare global {
  interface Window {
    tuning?: Tuning;
  }
}
