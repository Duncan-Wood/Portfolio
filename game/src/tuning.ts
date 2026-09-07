export interface Tuning {
  shadowInterval: number;

  arrivalsPerShadowStrength: number;

  fragmentDuration: number;

  readingPerCharacter: number;

  fallInterval: number;

  softDropInterval: number;

  lockDelay: number;

  autoShiftDelay: number;

  autoRepeatInterval: number;

  chainLinkDelay: number;

  settleDelay: number;

  popDuration: number;

  fallDuration: number;

  hitStopDuration: number;

  landingBounceDuration: number;

  shakeIntensity: number;

  shakeRollDegrees: number;
}

export const DEFAULT_TUNING: Tuning = {
  shadowInterval: 6000,
  arrivalsPerShadowStrength: 4,
  fragmentDuration: 1400,
  readingPerCharacter: 48,
  fallInterval: 400,
  softDropInterval: 50,
  lockDelay: 500,
  autoShiftDelay: 130,
  autoRepeatInterval: 40,
  chainLinkDelay: 220,
  settleDelay: 130,
  popDuration: 150,
  fallDuration: 120,
  hitStopDuration: 70,
  landingBounceDuration: 140,
  shakeIntensity: 0.004,
  shakeRollDegrees: 0.22,
};
