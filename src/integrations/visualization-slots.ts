import { readFile, readdir } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AstroIntegration } from 'astro';

import { visualizationLoaderIds } from '../visualizations/client-registry';
import {
  postVisualizations,
  type VisualizationManifest,
  type VisualizationPlacement,
} from '../visualizations/manifest';

export interface PostSource {
  slug: string;
  source: string;
}

export type ValidationIssueCode =
  | 'missing-post'
  | 'missing-heading'
  | 'duplicate-heading'
  | 'duplicate-placement'
  | 'missing-loader'
  | 'orphan-loader';

export interface ValidationIssue {
  code: ValidationIssueCode;
  message: string;
}

interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

interface RehypeFile {
  path?: string;
}

interface SlotPluginOptions {
  manifest?: VisualizationManifest;
}

function normalizeHeading(value: string): string {
  return value.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
}

export function extractMarkdownHeadings(source: string): string[] {
  const headings: string[] = [];
  let fence: { marker: '`' | '~'; length: number } | undefined;

  for (const line of source.split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const token = fenceMatch[1];
      const marker = token[0] as '`' | '~';
      if (!fence) {
        fence = { marker, length: token.length };
      } else if (fence.marker === marker && token.length >= fence.length) {
        fence = undefined;
      }
      continue;
    }

    if (fence) continue;

    const headingMatch = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (headingMatch) headings.push(normalizeHeading(headingMatch[1]));
  }

  return headings;
}

export function validateVisualizationContent(
  posts: readonly PostSource[],
  manifest: VisualizationManifest,
  loaderIds: readonly string[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const postsBySlug = new Map(posts.map((post) => [post.slug, post]));
  const manifestIds = new Set<string>();

  for (const [slug, placements] of Object.entries(manifest)) {
    const post = postsBySlug.get(slug);
    if (!post) {
      issues.push({ code: 'missing-post', message: `Visualization post "${slug}" does not exist.` });
      continue;
    }

    const headings = extractMarkdownHeadings(post.source);
    const targets = new Set<string>();

    for (const placement of placements) {
      manifestIds.add(placement.id);

      if (targets.has(placement.afterHeading)) {
        issues.push({
          code: 'duplicate-placement',
          message: `Post "${slug}" registers more than one visualization after "${placement.afterHeading}".`,
        });
        continue;
      }
      targets.add(placement.afterHeading);

      const matches = headings.filter((heading) => heading === placement.afterHeading).length;
      if (matches === 0) {
        issues.push({
          code: 'missing-heading',
          message: `Visualization "${placement.id}" in post "${slug}" expects heading "${placement.afterHeading}".`,
        });
      } else if (matches > 1) {
        issues.push({
          code: 'duplicate-heading',
          message: `Post "${slug}" contains heading "${placement.afterHeading}" ${matches} times.`,
        });
      }
    }
  }

  const loaderSet = new Set(loaderIds);
  for (const id of manifestIds) {
    if (!loaderSet.has(id)) {
      issues.push({ code: 'missing-loader', message: `Visualization "${id}" has no client loader.` });
    }
  }
  for (const id of loaderSet) {
    if (!manifestIds.has(id)) {
      issues.push({ code: 'orphan-loader', message: `Visualization loader "${id}" has no manifest entry.` });
    }
  }

  return issues;
}

function textContent(node: HastNode): string {
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(textContent).join('');
}

function element(
  tagName: string,
  properties: Record<string, unknown>,
  children: HastNode[],
): HastNode {
  return { type: 'element', tagName, properties, children };
}

function text(value: string): HastNode {
  return { type: 'text', value };
}

function createSlot(placement: VisualizationPlacement): HastNode {
  return element(
    'section',
    {
      className: ['visualization-slot'],
      dataVisualizationId: placement.id,
      dataAccent: placement.accent,
      ariaLabelledBy: `${placement.id.replace(/[:]/g, '-')}-title`,
    },
    [
      element('p', { className: ['visualization-slot__index'] }, [text('[INTERACTIVE FIGURE]')]),
      element('h3', { id: `${placement.id.replace(/[:]/g, '-')}-title` }, [text(placement.title)]),
      element('p', { className: ['visualization-slot__description'] }, [text(placement.description)]),
      element('pre', { className: ['visualization-slot__ascii'], ariaHidden: 'true' }, [
        text('+----------------------+\n|  LOADING COORDINATES |\n+----------------------+'),
      ]),
      element(
        'p',
        { className: ['visualization-slot__status'], role: 'status', ariaLive: 'polite' },
        [text('시각화를 불러올 준비가 되었습니다.')],
      ),
      element('div', { className: ['visualization-slot__mount'] }, []),
      element('div', { className: ['visualization-slot__error'], hidden: true }, [
        element('p', { role: 'alert' }, [text('시각화를 표시하지 못했습니다. 본문은 계속 읽을 수 있습니다.')]),
        element('button', { type: 'button', className: ['visualization-slot__retry'] }, [text('[RETRY →]')]),
      ]),
      element('noscript', {}, [
        element('p', {}, [text('JavaScript 없이도 본문과 시각화 설명을 읽을 수 있습니다.')]),
      ]),
    ],
  );
}

export function rehypeVisualizationSlots({
  manifest = postVisualizations,
}: SlotPluginOptions = {}) {
  return (tree: HastNode, file: RehypeFile) => {
    if (!file.path || !tree.children) return;
    const slug = basename(file.path).replace(/\.md$/, '');
    const placements = manifest[slug];
    if (!placements?.length) return;

    for (const placement of placements) {
      const indexes = tree.children
        .map((node, index) =>
          node.type === 'element' && /^h[1-6]$/.test(node.tagName ?? '') &&
          normalizeHeading(textContent(node)) === placement.afterHeading
            ? index
            : -1,
        )
        .filter((index) => index >= 0);

      if (indexes.length !== 1) {
        throw new Error(
          `Visualization "${placement.id}" in post "${slug}" expected one heading "${placement.afterHeading}", found ${indexes.length}.`,
        );
      }
      tree.children.splice(indexes[0] + 1, 0, createSlot(placement));
    }
  };
}

async function readPostSources(): Promise<PostSource[]> {
  const postsDirectory = fileURLToPath(new URL('../content/posts/', import.meta.url));
  const files = (await readdir(postsDirectory)).filter((file) => file.endsWith('.md')).sort();
  return Promise.all(
    files.map(async (file) => ({
      slug: file.replace(/\.md$/, ''),
      source: await readFile(new URL(`../content/posts/${file}`, import.meta.url), 'utf8'),
    })),
  );
}

export function visualizationValidationIntegration(): AstroIntegration {
  return {
    name: 'visualization-manifest-validation',
    hooks: {
      'astro:config:setup': async () => {
        const issues = validateVisualizationContent(
          await readPostSources(),
          postVisualizations,
          visualizationLoaderIds,
        );
        if (issues.length) {
          throw new Error(`Invalid visualization manifest:\n${issues.map((issue) => `- ${issue.message}`).join('\n')}`);
        }
      },
    },
  };
}
