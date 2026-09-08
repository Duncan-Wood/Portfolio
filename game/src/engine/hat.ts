import { type ChainLink } from './matching';

export const HAT_FULL_CHARGE = 12;

export function chargeFor(link: ChainLink, linkIndex: number): number {
  return link.cellsCleared * 2 ** linkIndex;
}
