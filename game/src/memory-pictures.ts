import { MAP_COLUMNS, MAP_ROWS, drawLand, drawMap } from './customer-map';
import { MEMORY_ART, type MemoryArt, type MemoryGrid } from './memory-art';

export const CUSTOMER_MAP_PICTURE = 'the-map';

export const CUSTOMER_MAP_LAND: MemoryGrid = drawLand(MAP_COLUMNS, MAP_ROWS);

export const MEMORY_PICTURES: Readonly<Record<string, MemoryArt>> = {
  ...MEMORY_ART,
  [CUSTOMER_MAP_PICTURE]: { ...drawMap(MAP_COLUMNS, MAP_ROWS), panel: drawMap(22, 16) },
};
