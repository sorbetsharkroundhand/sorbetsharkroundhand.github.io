import type { ComponentType } from 'react';

import type { AccentName } from './manifest';

export interface VisualizationProps {
  accent: AccentName;
}

export interface VisualizationModule {
  default: ComponentType<VisualizationProps>;
}

export type VisualizationLoader = () => Promise<VisualizationModule>;

export const visualizationLoaders = {
  'linear-regression:model': () =>
    import('../components/visualizations/linear-regression/LinearRegressionDemo'),
  'linear-regression:residuals': () =>
    import('../components/visualizations/linear-regression/LinearRegressionDemo'),
  'linear-regression:best-fit': () =>
    import('../components/visualizations/linear-regression/LinearRegressionDemo'),
} as const satisfies Record<string, VisualizationLoader>;

export const visualizationLoaderIds = Object.keys(visualizationLoaders);
