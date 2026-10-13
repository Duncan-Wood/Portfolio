import { DOOR_COLUMNS, DOOR_ROWS, STILL_MOMENT, drawDoor, drawDoorway } from './one-door';
import { MEMORY_ART, type MemoryArt, type MemoryGrid } from './memory-art';

export const ONE_DOOR_PICTURE = 'the-door';

export const ONE_DOOR_DOORWAY: MemoryGrid = drawDoorway(DOOR_COLUMNS, DOOR_ROWS);

export const MEMORY_PICTURES: Readonly<Record<string, MemoryArt>> = {
  ...MEMORY_ART,
  [ONE_DOOR_PICTURE]: {
    ...drawDoor(DOOR_COLUMNS, DOOR_ROWS, STILL_MOMENT),
    panel: drawDoor(22, 13, STILL_MOMENT),
  },
};
