import { DOOR_COLUMNS, DOOR_ROWS, STILL_MOMENT, drawDoor, drawDoorway } from './one-door';
import {
  REVIEW_COLUMNS,
  REVIEW_ROWS,
  STILL_MOMENT as REVIEW_STILL_MOMENT,
  drawReview,
  drawReviewBase,
} from './review-screen';
import { MEMORY_ART, type MemoryArt, type MemoryGrid } from './memory-art';

export const ONE_DOOR_PICTURE = 'the-door';

export const REVIEW_PICTURE = 'the-review';

export const ONE_DOOR_DOORWAY: MemoryGrid = drawDoorway(DOOR_COLUMNS, DOOR_ROWS);

export const REVIEW_BASE: MemoryGrid = drawReviewBase(REVIEW_COLUMNS, REVIEW_ROWS);

export const MEMORY_PICTURES: Readonly<Record<string, MemoryArt>> = {
  ...MEMORY_ART,
  [ONE_DOOR_PICTURE]: {
    ...drawDoor(DOOR_COLUMNS, DOOR_ROWS, STILL_MOMENT),
    panel: drawDoor(22, 13, STILL_MOMENT),
  },
  [REVIEW_PICTURE]: {
    ...drawReview(REVIEW_COLUMNS, REVIEW_ROWS, REVIEW_STILL_MOMENT),
    panel: drawReview(22, 13, REVIEW_STILL_MOMENT),
  },
};
