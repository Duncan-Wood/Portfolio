import { MAP_COLUMNS, MAP_ROWS, drawLand, drawMap } from './customer-map';
import { DOOR_COLUMNS, DOOR_ROWS, STILL_MOMENT, drawDoor, drawDoorway } from './one-door';
import { MEMORY_ART, type MemoryArt, type MemoryGrid } from './memory-art';

export const CUSTOMER_MAP_PICTURE = 'the-map';

export const ONE_DOOR_PICTURE = 'the-door';

export const CUSTOMER_MAP_LAND: MemoryGrid = drawLand(MAP_COLUMNS, MAP_ROWS);

export const ONE_DOOR_DOORWAY: MemoryGrid = drawDoorway(DOOR_COLUMNS, DOOR_ROWS);

export const MEMORY_PICTURES: Readonly<Record<string, MemoryArt>> = {
  ...MEMORY_ART,
  [CUSTOMER_MAP_PICTURE]: { ...drawMap(MAP_COLUMNS, MAP_ROWS), panel: drawMap(22, 16) },
  [ONE_DOOR_PICTURE]: {
    ...drawDoor(DOOR_COLUMNS, DOOR_ROWS, STILL_MOMENT),
    panel: drawDoor(22, 13, STILL_MOMENT),
  },
};
