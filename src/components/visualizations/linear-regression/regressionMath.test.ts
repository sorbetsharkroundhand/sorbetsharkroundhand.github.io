import { describe, expect, it } from 'vitest';

import { INITIAL_PARAMETERS, STUDY_DATA } from './regressionData';
import {
  calculateLeastSquares,
  calculateMSE,
  calculateResiduals,
  predict,
} from './regressionMath';

describe('linear regression calculations', () => {
  it('predicts a value from slope and intercept', () => {
    expect(predict(3, 2, 4)).toBe(10);
  });

  it('exposes the deterministic study data and initial parameters', () => {
    expect(STUDY_DATA).toHaveLength(8);
    expect(INITIAL_PARAMETERS).toEqual({ slope: 3.5, intercept: 52 });
  });

  it('calculates residuals as observed minus predicted', () => {
    expect(calculateResiduals([{ x: 1, y: 8 }], 2, 3)).toEqual([3]);
  });

  it('calculates mean squared error', () => {
    expect(calculateMSE([{ x: 1, y: 8 }], 2, 3)).toBe(9);
  });

  it('rejects an empty dataset when calculating MSE', () => {
    expect(() => calculateMSE([], 2, 3)).toThrow('at least one data point');
  });

  it('calculates the least-squares parameters for the study data', () => {
    const result = calculateLeastSquares(STUDY_DATA);

    expect(result.slope).toBeCloseTo(5.2023809524, 9);
    expect(result.intercept).toBeCloseTo(46.4642857143, 9);
  });

  it('calculates the study data MSE for the least-squares parameters', () => {
    expect(calculateMSE(STUDY_DATA, 5.2023809524, 46.4642857143)).toBeCloseTo(
      0.2693452381,
      9,
    );
  });

  it('rejects an empty dataset when calculating least squares', () => {
    expect(() => calculateLeastSquares([])).toThrow('at least one data point');
  });

  it('rejects a dataset with no x variance', () => {
    expect(() =>
      calculateLeastSquares([
        { x: 1, y: 2 },
        { x: 1, y: 4 },
      ]),
    ).toThrow('x variance');
  });
});
