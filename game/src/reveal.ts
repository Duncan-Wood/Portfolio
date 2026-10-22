import { FRAGMENT_COUNT, nodeAt, type MemoryNode } from './memories';
import {
  foundFragments,
  rememberCompletion,
  rememberFragment,
  rememberResume,
} from './progress';

export type Reveal =
  | { kind: 'none' }
  | { kind: 'found'; nodesRevealed: number; node: MemoryNode; firstFind: boolean }
  | { kind: 'won'; nodesRevealed: number; node: MemoryNode; firstFind: boolean };

export function revealNextNode(nodesRevealed: number): Reveal {
  const at = nodeAt(nodesRevealed);
  if (at === null) {
    return { kind: 'none' };
  }

  const firstFind = foundFragments().length === 0;
  const revealed = nodesRevealed + 1;
  rememberFragment(nodesRevealed, { title: at.node.title }, FRAGMENT_COUNT);
  rememberResume(revealed, FRAGMENT_COUNT);

  if (nodeAt(revealed) !== null) {
    return { kind: 'found', nodesRevealed: revealed, node: at.node, firstFind };
  }

  rememberCompletion();
  return { kind: 'won', nodesRevealed: revealed, node: at.node, firstFind };
}
