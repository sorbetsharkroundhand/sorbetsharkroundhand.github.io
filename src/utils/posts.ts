import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export function sortPostsNewestFirst(posts: readonly Post[]): Post[] {
  return [...posts].sort(
    (left, right) => right.data.publishedAt.getTime() - left.data.publishedAt.getTime(),
  );
}

export async function getPublishedPosts(): Promise<Post[]> {
  const { getCollection } = await import('astro:content');
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return sortPostsNewestFirst(posts);
}

export function getPostNeighbors(
  posts: readonly Post[],
  id: string,
): { older: Post | undefined; newer: Post | undefined } {
  const index = posts.findIndex((post) => post.id === id);
  if (index < 0) return { older: undefined, newer: undefined };
  return { older: posts[index + 1], newer: posts[index - 1] };
}
