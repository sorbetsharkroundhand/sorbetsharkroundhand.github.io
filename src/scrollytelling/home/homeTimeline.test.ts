import { describe, expect, it } from 'vitest';

import { sampleHomeTimeline } from './homeTimeline';

describe('sampleHomeTimeline', () => {
  it.each([
    [-1, 0, 'emergence'],
    [0.2, 0.2, 'topology'],
    [0.47, 0.47, 'statement'],
    [0.68, 0.68, 'dissolution'],
    [0.9, 0.9, 'reconstruction'],
    [2, 1, 'reconstruction'],
  ] as const)('clamps %s and selects its chapter', (input, progress, chapter) => {
    expect(sampleHomeTimeline(input)).toMatchObject({ progress, chapter });
  });

  it('selects the next chapter at every approved boundary', () => {
    expect(sampleHomeTimeline(0.14).chapter).toBe('topology');
    expect(sampleHomeTimeline(0.38).chapter).toBe('statement');
    expect(sampleHomeTimeline(0.56).chapter).toBe('dissolution');
    expect(sampleHomeTimeline(0.8).chapter).toBe('reconstruction');
  });

  it('returns identical state for identical progress', () => {
    expect(sampleHomeTimeline(0.673)).toEqual(sampleHomeTimeline(0.673));
  });

  it('can be sampled backwards without retaining later state', () => {
    sampleHomeTimeline(0.95);

    expect(sampleHomeTimeline(0.1)).toEqual(sampleHomeTimeline(0.1));
    expect(sampleHomeTimeline(0.1).indexOpacity).toBe(0);
  });

  it('moves visual emphasis from topology through statement and ASCII to the index', () => {
    const topology = sampleHomeTimeline(0.25);
    const statement = sampleHomeTimeline(0.47);
    const dissolution = sampleHomeTimeline(0.68);
    const reconstruction = sampleHomeTimeline(1);

    expect(topology.topologyOpacity).toBeGreaterThan(0.95);
    expect(statement.statementOpacity).toBeGreaterThan(0.95);
    expect(dissolution.asciiOpacity).toBeGreaterThan(0.95);
    expect(reconstruction.indexOpacity).toBe(1);
    expect(reconstruction.topologyOpacity).toBe(0);
  });

  it('keeps every opacity inside the renderable range', () => {
    for (let step = 0; step <= 100; step += 1) {
      const state = sampleHomeTimeline(step / 100);

      for (const opacity of [
        state.topologyOpacity,
        state.statementOpacity,
        state.asciiOpacity,
        state.indexOpacity,
      ]) {
        expect(opacity).toBeGreaterThanOrEqual(0);
        expect(opacity).toBeLessThanOrEqual(1);
      }
    }
  });
});
