import { describe, expect, it } from 'vitest';
import {
  PIECE_TYPE_COUNT,
  isAnchored,
  isColour,
  isNeuron,
  isNeuronLit,
  isShadow,
  neuronCell,
  shadowCell,
} from './grid';

describe('the neuron', () => {
  it('is not a colour, so it can never join a group', () => {
    expect(isColour(neuronCell(false))).toBe(false);
    expect(isColour(neuronCell(true))).toBe(false);
  });

  it('is not a shadow, however far past the colours it is numbered', () => {
    expect(isShadow(neuronCell(false))).toBe(false);
    expect(isShadow(neuronCell(true))).toBe(false);
  });

  it('remembers whether it has been reached', () => {
    expect(isNeuronLit(neuronCell(false))).toBe(false);
    expect(isNeuronLit(neuronCell(true))).toBe(true);
  });

  it('recognises both of its values as a neuron', () => {
    expect(isNeuron(neuronCell(false))).toBe(true);
    expect(isNeuron(neuronCell(true))).toBe(true);
  });

  it('does not claim a shadow or a colour as one of its own', () => {
    expect(isNeuron(0)).toBe(false);
    expect(isNeuron(shadowCell(0))).toBe(false);
    expect(isNeuron(shadowCell(PIECE_TYPE_COUNT - 1))).toBe(false);
    expect(isNeuron(null)).toBe(false);
  });

  it('is anchored, where a colour and a shadow both fall', () => {
    expect(isAnchored(neuronCell(false))).toBe(true);
    expect(isAnchored(neuronCell(true))).toBe(true);
    expect(isAnchored(0)).toBe(false);
    expect(isAnchored(shadowCell(0))).toBe(false);
    expect(isAnchored(null)).toBe(false);
  });
});
