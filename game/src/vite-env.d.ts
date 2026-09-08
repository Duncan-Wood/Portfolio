/// <reference types="vite/client" />

import type { Tuning } from './tuning';
import type { Simulation } from './engine/simulation';
import type { BoardScene } from './scenes/BoardScene';

declare global {
  const __BUILD_ID__: string;

  interface ImportMetaEnv {
    readonly VITE_GAME_CODE?: string;
  }

  interface Window {
    tuning?: Tuning;
    simulation?: Simulation;
    boardScene?: BoardScene;
  }
}
