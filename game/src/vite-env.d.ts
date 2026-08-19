/// <reference types="vite/client" />

import type { Tuning } from './tuning';
import type { Simulation } from './engine/simulation';
import type { BoardScene } from './scenes/BoardScene';

declare global {
  interface Window {
    tuning?: Tuning;
    simulation?: Simulation;
    boardScene?: BoardScene;
  }
}
