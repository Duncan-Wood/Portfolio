import { drawMap } from './customer-map';
import { MEMORY_ART, type MemoryArt } from './memory-art';

export const MEMORY_PICTURES: Readonly<Record<string, MemoryArt>> = {
  ...MEMORY_ART,
  'the-map': { ...drawMap(110, 82), panel: drawMap(22, 16) },
};
