import { describe, expect, it } from 'vitest';

import { postVisualizations } from './manifest';

describe('visualization manifest', () => {
  it('registers the three learning moments with one accent each', () => {
    expect(postVisualizations['linear-regression']).toEqual([
      expect.objectContaining({
        id: 'linear-regression:model',
        afterHeading: '직접 움직여보기',
        accent: 'cyan',
      }),
      expect.objectContaining({
        id: 'linear-regression:residuals',
        afterHeading: 'Residual Visualization',
        accent: 'red',
      }),
      expect.objectContaining({
        id: 'linear-regression:best-fit',
        afterHeading: 'Find Best Fit',
        accent: 'yellow',
      }),
    ]);
  });
});
