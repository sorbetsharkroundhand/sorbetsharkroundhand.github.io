export interface DataPoint {
  x: number;
  y: number;
}

export interface RegressionParameters {
  slope: number;
  intercept: number;
}

export const STUDY_DATA = [
  { x: 1, y: 52 },
  { x: 2, y: 57 },
  { x: 3, y: 61 },
  { x: 4, y: 68 },
  { x: 5, y: 72 },
  { x: 6, y: 78 },
  { x: 7, y: 83 },
  { x: 8, y: 88 },
] as const satisfies readonly DataPoint[];

export const INITIAL_PARAMETERS = {
  slope: 3.5,
  intercept: 52,
} as const satisfies RegressionParameters;
