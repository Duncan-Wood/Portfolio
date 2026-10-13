import { RECOVERED_LINE } from './shadow-voice';

export const CLOSING_CANDIDATES: readonly string[] = [
  RECOVERED_LINE,
  'Making connections with people is what moves my life forward. I don’t know '
    + 'what the next one is yet. It could be you.',
  'Every connection I’ve made has taken me somewhere I wasn’t planning to go. '
    + 'The next one is still dark. It could be you.',
  'The people I’ve connected with are why any of this happened. I don’t know '
    + 'who is next. It could be you.',
  'I keep ending up somewhere new because of people I met. I don’t know where '
    + 'next is yet. Maybe it runs through you.',
];

export function closingFromQuery(search: string): string {
  const named = Number(new URLSearchParams(search).get('closing'));
  return CLOSING_CANDIDATES[named - 1] ?? CLOSING_CANDIDATES[0];
}
