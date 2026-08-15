import type { CollectionEntry } from 'astro:content';
import { describe, expect, it } from 'vitest';

import { getPostNeighbors, sortPostsNewestFirst } from './posts';

function post(id: string, date: string): CollectionEntry<'posts'> {
  return {
    id,
    collection: 'posts',
    data: {
      title: id,
      subtitle: `${id} subtitle`,
      description: `${id} description`,
      publishedAt: new Date(`${date}T00:00:00Z`),
      category: 'Statistics',
      topics: [id],
      draft: false,
    },
    body: '',
  };
}

describe('post ordering', () => {
  const older = post('older', '2026-01-01');
  const middle = post('middle', '2026-02-01');
  const newer = post('newer', '2026-03-01');

  it('sorts published notes newest first without mutating the input', () => {
    const input = [older, newer, middle];
    expect(sortPostsNewestFirst(input).map(({ id }) => id)).toEqual(['newer', 'middle', 'older']);
    expect(input.map(({ id }) => id)).toEqual(['older', 'newer', 'middle']);
  });

  it('returns the next older and newer notes from a newest-first list', () => {
    const posts = [newer, middle, older];
    expect(getPostNeighbors(posts, 'middle')).toEqual({ older, newer });
    expect(getPostNeighbors(posts, 'newer')).toEqual({ older: middle, newer: undefined });
    expect(getPostNeighbors(posts, 'older')).toEqual({ older: undefined, newer: middle });
  });
});
