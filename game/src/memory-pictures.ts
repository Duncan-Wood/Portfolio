import { findBars } from './cost-bars';
import { MEMORY_ART, type MemoryArt, type MemoryGrid } from './memory-art';

export const COST_BARS_PICTURE = 'the-bills';

const COST_CHART = findBars(MEMORY_ART[COST_BARS_PICTURE]);

export const COST_BARS = COST_CHART.bars;

export const COST_BARS_BASE: MemoryGrid = COST_CHART.base;

export const MEMORY_PICTURES: Readonly<Record<string, MemoryArt>> = MEMORY_ART;
