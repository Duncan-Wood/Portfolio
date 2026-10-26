export type HandoverStage = 'settle' | 'fade' | 'bloom' | 'flight' | 'land' | 'return';

export const FOUND_CAUGHT_HOLD_MS = 200;
export const FOUND_DROP_MS = 400;
export const FOUND_LAND_FADE_MS = 120;
export const PURSE_FLASH_MS = 380;

export const HANDOVER_TIMELINE: readonly { stage: HandoverStage; lasts: number }[] = [
  { stage: 'settle', lasts: 700 },
  { stage: 'fade', lasts: 520 },
  { stage: 'bloom', lasts: 720 },
  { stage: 'flight', lasts: 560 },
  {
    stage: 'land',
    lasts: FOUND_CAUGHT_HOLD_MS + FOUND_DROP_MS + Math.max(FOUND_LAND_FADE_MS, PURSE_FLASH_MS),
  },
  { stage: 'return', lasts: 520 },
];

export function stageStart(stage: HandoverStage): number {
  let start = 0;
  for (const entry of HANDOVER_TIMELINE) {
    if (entry.stage === stage) {
      return start;
    }
    start += entry.lasts;
  }
  throw new Error(`No handover stage called ${stage}`);
}

export function stageLength(stage: HandoverStage): number {
  return HANDOVER_TIMELINE.find((entry) => entry.stage === stage)!.lasts;
}

export function stagesBegun(before: number, after: number): HandoverStage[] {
  return HANDOVER_TIMELINE
    .map(({ stage }) => stage)
    .filter((stage) => before < stageStart(stage) && stageStart(stage) <= after);
}

export function advanceHandover(elapsed: number, delta: number, settled: boolean): number {
  const next = elapsed + delta;
  return settled ? next : Math.min(next, stageStart('fade') - 1);
}
