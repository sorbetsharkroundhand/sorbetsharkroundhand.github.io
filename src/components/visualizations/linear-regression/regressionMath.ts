import type { DataPoint, RegressionParameters } from './regressionData';

export type { DataPoint, RegressionParameters } from './regressionData';

export function predict(x: number, slope: number, intercept: number): number {
  return slope * x + intercept;
}

export function calculateResiduals(
  points: readonly DataPoint[],
  slope: number,
  intercept: number,
): number[] {
  return points.map(({ x, y }) => y - predict(x, slope, intercept));
}

export function calculateMSE(
  points: readonly DataPoint[],
  slope: number,
  intercept: number,
): number {
  if (points.length === 0) {
    throw new Error('MSE requires at least one data point');
  }

  const residuals = calculateResiduals(points, slope, intercept);
  return residuals.reduce((sum, residual) => sum + residual ** 2, 0) / points.length;
}

export function calculateLeastSquares(
  points: readonly DataPoint[],
): RegressionParameters {
  if (points.length === 0) {
    throw new Error('Least squares requires at least one data point');
  }

  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const covarianceNumerator = points.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY),
    0,
  );
  const xVarianceDenominator = points.reduce(
    (sum, point) => sum + (point.x - meanX) ** 2,
    0,
  );

  if (xVarianceDenominator === 0) {
    throw new Error('Cannot calculate least squares when x variance is zero');
  }

  const slope = covarianceNumerator / xVarianceDenominator;
  return { slope, intercept: meanY - slope * meanX };
}
