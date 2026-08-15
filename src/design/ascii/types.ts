export type AsciiVariant = readonly string[];

export interface AsciiArtEntry {
  id: string;
  label: string;
  desktop: AsciiVariant;
  mobile: AsciiVariant;
  thumbnail: AsciiVariant;
}

export type AsciiArtKind = 'hero' | 'detail' | 'thumbnail' | 'loading' | '404';

export interface AsciiArtRequest {
  slug?: string;
  category?: string;
  kind: AsciiArtKind;
}

export function alignAscii(lines: readonly string[]): readonly string[] {
  const width = Math.max(...lines.map((line) => line.length));
  return lines.map((line) => line.padEnd(width, ' '));
}
