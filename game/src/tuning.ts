export interface Tuning {
  fallInterval: number;
  softDropInterval: number;
  lockDelay: number;
  autoShiftDelay: number;
  autoRepeatInterval: number;
  chainLinkDelay: number;
}

export const DEFAULT_TUNING: Tuning = {
  fallInterval: 800,
  softDropInterval: 50,
  lockDelay: 500,
  autoShiftDelay: 130,
  autoRepeatInterval: 40,
  chainLinkDelay: 220,
};
