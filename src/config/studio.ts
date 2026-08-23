import { SITE_REPO } from './site';

export const POSTS_CONTENT_PATH = 'src/content/posts';

export const STUDIO_ALLOWED_LOGINS: readonly string[] = [SITE_REPO.owner];

export const SESSION_STORAGE_KEY = 'interactive-notes:studio-token';

export const CATEGORIES = [
  'Statistics',
  'Machine Learning',
  'Deep Learning',
  'Mathematics',
  'Visualization',
] as const;

export type PostCategory = (typeof CATEGORIES)[number];
