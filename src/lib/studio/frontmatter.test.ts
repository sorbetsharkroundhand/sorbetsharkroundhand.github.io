import { describe, expect, it } from 'vitest';

import {
  composePostFile,
  parseTopics,
  serializeFrontmatter,
  slugify,
  validateDraft,
  type PostDraft,
} from './frontmatter';

const VALID_DRAFT: PostDraft = {
  category: 'Statistics',
  description: '직선을 움직이며 예측과 잔차를 관찰합니다.',
  draft: false,
  publishedAt: '2026-08-23',
  slug: 'linear-regression',
  subtitle: '선형회귀를 눈으로 이해하기',
  title: 'Linear Regression',
  topics: ['linear-regression', 'least-squares'],
};

describe('slugify', () => {
  it.each([
    ['Linear Regression', 'linear-regression'],
    ['  Hello,  World!  ', 'hello-world'],
    ['이미 방문한 좌표', ''],
    ['already-slug', 'already-slug'],
    ['-trim-me-', 'trim-me'],
  ])('slugifies %s into %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('serializeFrontmatter', () => {
  it('writes the exact schema the content collection expects', () => {
    const yaml = serializeFrontmatter(VALID_DRAFT);
    expect(yaml).toBe(
      [
        '---',
        'title: "Linear Regression"',
        'subtitle: "선형회귀를 눈으로 이해하기"',
        'description: "직선을 움직이며 예측과 잔차를 관찰합니다."',
        'publishedAt: 2026-08-23',
        'category: Statistics',
        'topics:',
        '  - linear-regression',
        '  - least-squares',
        'draft: false',
        '---',
        '',
      ].join('\n'),
    );
  });

  it('appends updatedAt only when present', () => {
    const yaml = serializeFrontmatter({ ...VALID_DRAFT, updatedAt: '2026-08-24' });
    expect(yaml).toContain('updatedAt: 2026-08-24');

    expect(serializeFrontmatter(VALID_DRAFT)).not.toContain('updatedAt');
  });

  it('quotes topics that could be misread by YAML', () => {
    const yaml = serializeFrontmatter({ ...VALID_DRAFT, topics: ['no'] });
    expect(yaml).toContain('  - no');
  });
});

describe('composePostFile', () => {
  it('joins frontmatter, a separator, and the trimmed body', () => {
    const file = composePostFile(VALID_DRAFT, '\n\n## 데이터에서 직선 찾기\n\n본문입니다.  \n');
    expect(file.startsWith('---\ntitle: "Linear Regression"')).toBe(true);
    expect(file).toContain('\ndraft: false\n---\n');
    expect(file.endsWith('## 데이터에서 직선 찾기\n\n본문입니다.\n')).toBe(true);
  });
});

describe('validateDraft', () => {
  it('accepts a complete draft without errors', () => {
    expect(validateDraft(VALID_DRAFT)).toEqual({});
  });

  it('reports every missing required field', () => {
    const errors = validateDraft({
      ...VALID_DRAFT,
      category: '',
      publishedAt: 'nope',
      slug: 'Bad Slug',
      title: '',
      topics: [],
    });
    expect(Object.keys(errors).sort()).toEqual([
      'category',
      'publishedAt',
      'slug',
      'title',
      'topics',
    ]);
  });
});

describe('parseTopics', () => {
  it('normalizes comma separated input into unique slugs', () => {
    expect(parseTopics('Linear Regression, least-squares,  Linear Regression ')).toEqual([
      'linear-regression',
      'least-squares',
    ]);
    expect(parseTopics('')).toEqual([]);
  });
});
