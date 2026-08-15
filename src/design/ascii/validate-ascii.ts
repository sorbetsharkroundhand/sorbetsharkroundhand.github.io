import type { AsciiArtEntry, AsciiVariant } from './types';

export type AsciiValidationCode =
  | 'missing-label'
  | 'empty-variant'
  | 'inconsistent-width'
  | 'line-too-wide';

export interface AsciiValidationIssue {
  code: AsciiValidationCode;
  variant?: keyof Pick<AsciiArtEntry, 'desktop' | 'mobile' | 'thumbnail'>;
  message: string;
}

const limits = {
  desktop: 78,
  mobile: 34,
  thumbnail: 22,
} as const;

function validateVariant(
  name: keyof typeof limits,
  lines: AsciiVariant,
): AsciiValidationIssue[] {
  if (lines.length === 0) {
    return [{ code: 'empty-variant', variant: name, message: `${name} is empty` }];
  }

  const widths = new Set(lines.map((line) => line.length));
  if (widths.size > 1) {
    return [{ code: 'inconsistent-width', variant: name, message: `${name} lines must align` }];
  }

  if (lines.some((line) => line.length > limits[name])) {
    return [{ code: 'line-too-wide', variant: name, message: `${name} exceeds ${limits[name]}` }];
  }

  return [];
}

export function validateAsciiArt(entry: AsciiArtEntry): AsciiValidationIssue[] {
  if (!entry.label.trim()) {
    return [{ code: 'missing-label', message: 'ASCII art needs an accessible label' }];
  }

  for (const name of ['desktop', 'mobile', 'thumbnail'] as const) {
    const issues = validateVariant(name, entry[name]);
    if (issues.length > 0) return issues;
  }

  return [];
}
