import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const postsDirectory = fileURLToPath(new URL('./posts/', import.meta.url));

describe('post authoring policy', () => {
  it('keeps every post as plain Markdown without presentation syntax', () => {
    const postFiles = readdirSync(postsDirectory)
      .filter((file) => /\.mdx?$/.test(file))
      .sort();

    expect(postFiles).toEqual(['linear-regression.md']);

    for (const file of postFiles) {
      const source = readFileSync(new URL(`./posts/${file}`, import.meta.url), 'utf8');

      expect(source).not.toMatch(/^(?:import|export)\s/m);
      expect(source).not.toMatch(/<\/?[A-Z][^>]*>|client:|wide-figure|wideFigures/);
    }
  });
});
