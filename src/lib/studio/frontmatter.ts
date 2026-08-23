import { CATEGORIES, type PostCategory } from '../../config/studio';

export interface PostDraft {
  title: string;
  subtitle: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  category: PostCategory | '';
  topics: string[];
  draft: boolean;
  slug: string;
}

export interface PostDraftErrors {
  title?: string;
  subtitle?: string;
  description?: string;
  category?: string;
  topics?: string;
  publishedAt?: string;
  slug?: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function yamlScalar(value: string): string {
  // Bare scalars only when the value cannot be misread by YAML parsers.
  return /^[\w ./-]+$/.test(value) ? value : quote(value);
}

export function serializeFrontmatter(draft: PostDraft): string {
  const lines = [
    '---',
    `title: ${quote(draft.title)}`,
    `subtitle: ${quote(draft.subtitle)}`,
    `description: ${quote(draft.description)}`,
    `publishedAt: ${draft.publishedAt}`,
  ];
  if (draft.updatedAt && ISO_DATE.test(draft.updatedAt)) {
    lines.push(`updatedAt: ${draft.updatedAt}`);
  }
  lines.push(`category: ${draft.category as string}`);
  if (draft.topics.length > 0) {
    lines.push('topics:');
    for (const topic of draft.topics) lines.push(`  - ${yamlScalar(topic)}`);
  }
  lines.push(`draft: ${draft.draft}`, '---', '');
  return lines.join('\n');
}

export function composePostFile(draft: PostDraft, body: string): string {
  return `${serializeFrontmatter(draft)}\n${body.trim()}\n`;
}

export function validateDraft(draft: PostDraft): PostDraftErrors {
  const errors: PostDraftErrors = {};
  if (!draft.title.trim()) errors.title = '제목을 입력하세요.';
  if (!draft.subtitle.trim()) errors.subtitle = '부제를 입력하세요.';
  if (!draft.description.trim()) errors.description = '설명을 입력하세요.';
  if (!ISO_DATE.test(draft.publishedAt)) errors.publishedAt = '발행일을 확인하세요.';
  else if (Number.isNaN(Date.parse(draft.publishedAt))) {
    errors.publishedAt = '발행일을 확인하세요.';
  }
  if (!(CATEGORIES as readonly string[]).includes(draft.category)) {
    errors.category = '분류를 선택하세요.';
  }
  if (draft.topics.length === 0) errors.topics = '주제를 하나 이상 추가하세요.';
  if (!SLUG_PATTERN.test(draft.slug)) {
    errors.slug = '슬러그는 소문자 영문·숫자와 하이픈만 사용합니다.';
  }
  return errors;
}

export function hasErrors(errors: PostDraftErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function parseTopics(input: string): string[] {
  const seen = new Set<string>();
  for (const raw of input.split(',')) {
    const topic = slugify(raw);
    if (topic) seen.add(topic);
  }
  return [...seen];
}
