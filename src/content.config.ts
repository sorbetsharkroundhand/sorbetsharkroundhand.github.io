import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    category: z.enum([
      'Statistics',
      'Machine Learning',
      'Deep Learning',
      'Mathematics',
      'Visualization',
    ]),
    topics: z.array(z.string().min(1)).min(1),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
