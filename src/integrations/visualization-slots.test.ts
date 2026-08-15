import { describe, expect, it } from 'vitest';

import type { VisualizationManifest } from '../visualizations/manifest';
import {
  rehypeVisualizationSlots,
  validateVisualizationContent,
} from './visualization-slots';

const placement = {
  id: 'lesson:demo',
  afterHeading: 'Try it',
  accent: 'cyan',
  title: 'Interactive demo',
  description: 'Change the values and observe the result.',
} as const;

const manifest: VisualizationManifest = { lesson: [placement] };

describe('visualization content validation', () => {
  it('accepts a post with one exact heading and matching loader', () => {
    const issues = validateVisualizationContent(
      [{ slug: 'lesson', source: '# Lesson\n\n## Try it\n\nMove the control.' }],
      manifest,
      ['lesson:demo'],
    );

    expect(issues).toEqual([]);
  });

  it.each([
    {
      name: 'missing post',
      posts: [],
      currentManifest: manifest,
      loaders: ['lesson:demo'],
      code: 'missing-post',
    },
    {
      name: 'missing heading',
      posts: [{ slug: 'lesson', source: '# Lesson\n\n## Read only' }],
      currentManifest: manifest,
      loaders: ['lesson:demo'],
      code: 'missing-heading',
    },
    {
      name: 'duplicate heading',
      posts: [{ slug: 'lesson', source: '## Try it\n\nText\n\n## Try it' }],
      currentManifest: manifest,
      loaders: ['lesson:demo'],
      code: 'duplicate-heading',
    },
    {
      name: 'duplicate placement',
      posts: [{ slug: 'lesson', source: '## Try it' }],
      currentManifest: { lesson: [placement, { ...placement, id: 'lesson:second' }] },
      loaders: ['lesson:demo', 'lesson:second'],
      code: 'duplicate-placement',
    },
    {
      name: 'missing loader',
      posts: [{ slug: 'lesson', source: '## Try it' }],
      currentManifest: manifest,
      loaders: [],
      code: 'missing-loader',
    },
    {
      name: 'orphan loader',
      posts: [{ slug: 'lesson', source: '## Try it' }],
      currentManifest: manifest,
      loaders: ['lesson:demo', 'lesson:orphan'],
      code: 'orphan-loader',
    },
  ])('reports a precise issue for $name', ({ posts, currentManifest, loaders, code }) => {
    const issues = validateVisualizationContent(posts, currentManifest, loaders);

    expect(issues[0]?.code).toBe(code);
    expect(issues[0]?.message).toMatch(/lesson/);
  });

  it('ignores heading-like text inside fenced code', () => {
    const issues = validateVisualizationContent(
      [{ slug: 'lesson', source: '```md\n## Try it\n```' }],
      manifest,
      ['lesson:demo'],
    );

    expect(issues[0]?.code).toBe('missing-heading');
  });
});

describe('visualization slot insertion', () => {
  it('inserts meaningful static markup immediately after the matching heading', () => {
    const tree = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'h2', properties: {}, children: [{ type: 'text', value: 'Try it' }] },
        { type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: 'Body' }] },
      ],
    };
    const transform = rehypeVisualizationSlots({ manifest });

    transform(tree, { path: '/project/src/content/posts/lesson.md' });

    expect(tree.children[1]).toMatchObject({
      type: 'element',
      tagName: 'section',
      properties: {
        className: ['visualization-slot'],
        dataVisualizationId: 'lesson:demo',
        dataAccent: 'cyan',
      },
    });
    expect(JSON.stringify(tree.children[1])).toContain('Change the values and observe the result.');
    expect(JSON.stringify(tree.children[1])).toContain('noscript');
  });
});
