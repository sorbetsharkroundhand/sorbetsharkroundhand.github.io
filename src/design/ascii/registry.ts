import { notebookDefaultArt, statisticsArt } from './category-defaults';
import { linearRegressionArt } from './linear-regression';
import { notFoundArt } from './not-found';
import { siteHeroArt } from './site-hero';
import type { AsciiArtEntry, AsciiArtRequest } from './types';

const bySlug = new Map<string, AsciiArtEntry>([['linear-regression', linearRegressionArt]]);
const byCategory = new Map<string, AsciiArtEntry>([['statistics', statisticsArt]]);

export const registeredAsciiArt = [
  siteHeroArt,
  notFoundArt,
  linearRegressionArt,
  statisticsArt,
  notebookDefaultArt,
] as const;

export function resolveAsciiArt({ slug, category, kind }: AsciiArtRequest): AsciiArtEntry {
  if (kind === 'hero') return siteHeroArt;
  if (kind === '404') return notFoundArt;
  if (slug && bySlug.has(slug)) return bySlug.get(slug)!;
  if (category && byCategory.has(category.toLowerCase())) {
    return byCategory.get(category.toLowerCase())!;
  }
  return notebookDefaultArt;
}
