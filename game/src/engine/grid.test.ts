import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  FIRST_VISIBLE_ROW,
  HIDDEN_ROWS,
  PIECE_TYPE_COUNT,
  ROWS,
  VISIBLE_ROWS,
  chrysalisCell,
  isAnchored,
  isChrysalis,
  isColour,
  isNeuron,
  isNeuronLit,
  isShadow,
  neuronCell,
  shadowCell,
} from './grid';

describe('grid dimensions', () => {
  it('is six columns wide', () => {
    expect(COLUMNS).toBe(6);
  });

  it('shows twelve rows', () => {
    expect(VISIBLE_ROWS).toBe(12);
  });

  it('has one hidden row above them', () => {
    expect(HIDDEN_ROWS).toBe(1);
  });

  it('is the two added together', () => {
    expect(ROWS).toBe(VISIBLE_ROWS + HIDDEN_ROWS);
  });

  it('starts the visible field below the hidden rows', () => {
    expect(FIRST_VISIBLE_ROW).toBe(HIDDEN_ROWS);
  });

  it('has four piece types', () => {
    expect(PIECE_TYPE_COUNT).toBe(4);
  });
});

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

describe('a chrysalis', () => {
  it('is its own kind of cell, not a colour, a shadow or a neuron', () => {
    expect(isChrysalis(chrysalisCell())).toBe(true);
    expect(isChrysalis(0)).toBe(false);
    expect(isChrysalis(shadowCell(0))).toBe(false);
    expect(isChrysalis(neuronCell(false))).toBe(false);
    expect(isChrysalis(neuronCell(true))).toBe(false);
    expect(isChrysalis(null)).toBe(false);
  });

  it('is not mistaken for a neuron or a colour by the other predicates', () => {
    expect(isNeuron(chrysalisCell())).toBe(false);
    expect(isColour(chrysalisCell())).toBe(false);
    expect(isShadow(chrysalisCell())).toBe(false);
  });

  it('stays where it is put, like a neuron', () => {
    expect(isAnchored(chrysalisCell())).toBe(true);
  });
});
