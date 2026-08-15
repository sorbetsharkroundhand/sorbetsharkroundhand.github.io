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
    import('./linear-regression/LineModelDemo'),
  'linear-regression:residuals': () =>
    import('./linear-regression/ResidualDemo'),
  'linear-regression:best-fit': () =>
    import('./linear-regression/BestFitDemo'),
} as const satisfies Record<string, VisualizationLoader>;

export const visualizationLoaderIds = Object.keys(visualizationLoaders);
