export const visualizationLoaders = {
  'linear-regression:model': () =>
    import('../components/visualizations/linear-regression/LinearRegressionDemo'),
  'linear-regression:residuals': () =>
    import('../components/visualizations/linear-regression/LinearRegressionDemo'),
  'linear-regression:best-fit': () =>
    import('../components/visualizations/linear-regression/LinearRegressionDemo'),
} as const;

export const visualizationLoaderIds = Object.keys(visualizationLoaders);
