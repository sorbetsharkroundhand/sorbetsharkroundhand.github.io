import { describe, expect, it } from 'vitest';

import { resolveAsciiArt } from './registry';
import { normalizeAsciiSource, siteHeroArt } from './site-hero';
import type { AsciiArtEntry } from './types';
import { validateAsciiArt } from './validate-ascii';

describe('ASCII art registry', () => {
  it('resolves post art before category and neutral fallbacks', () => {
    expect(
      resolveAsciiArt({ slug: 'linear-regression', category: 'Statistics', kind: 'detail' }).id,
    ).toBe('linear-regression');
    expect(resolveAsciiArt({ slug: 'unknown', category: 'Statistics', kind: 'detail' }).id).toBe(
      'category-statistics',
    );
    expect(resolveAsciiArt({ slug: 'unknown', category: 'Unknown', kind: 'detail' }).id).toBe(
      'notebook-default',
    );
  });

  it('keeps every registered variant within its responsive width contract', () => {
    const entry = resolveAsciiArt({ slug: 'linear-regression', category: 'Statistics', kind: 'detail' });

    expect(validateAsciiArt(entry)).toEqual([]);
  });

  it('preserves the supplied hero composition across responsive variants', () => {
    expect(siteHeroArt.desktop).toEqual(siteHeroArt.mobile);
    expect(siteHeroArt.desktop.length).toBeGreaterThan(90);
    expect(siteHeroArt.desktop.join('\n')).toContain('-,,,,,,,,,.');
    expect(validateAsciiArt(siteHeroArt)).toEqual([]);
  });

  it('removes only blank outer rows and shared indentation from supplied art', () => {
    expect(normalizeAsciiSource('\n    ,,  \n      . \n\n')).toEqual([',,  ', '  . ']);
  });

  it.each([
    {
      name: 'missing label',
      entry: { label: '' },
      code: 'missing-label',
    },
    {
      name: 'inconsistent line width',
      entry: { desktop: ['----', '--'] },
      code: 'inconsistent-width',
    },
    {
      name: 'desktop overflow',
      entry: { desktop: ['x'.repeat(79)] },
      code: 'line-too-wide',
    },
  ])('rejects $name', ({ entry, code }) => {
    const invalid = {
      id: 'invalid',
      label: 'test art',
      desktop: ['----'],
      mobile: ['--'],
      thumbnail: ['-'],
      ...entry,
    } satisfies AsciiArtEntry;

    expect(validateAsciiArt(invalid)[0]?.code).toBe(code);
  });
});
