import suppliedHeroSource from './site-hero.txt?raw';
import { alignAscii, type AsciiArtEntry } from './types';

export function normalizeAsciiSource(source: string): readonly string[] {
  const lines = source.replaceAll('\r\n', '\n').split('\n');

  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines.at(-1)?.trim() === '') lines.pop();

  const indentation = Math.min(
    ...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)?.[0].length ?? 0),
  );

  return alignAscii(lines.map((line) => line.slice(indentation)));
}

const suppliedHero = normalizeAsciiSource(suppliedHeroSource);

export const siteHeroArt: AsciiArtEntry = {
  id: 'site-hero',
  label: '점과 쉼표로 명암을 표현한 사용자의 대형 ASCII 아트',
  desktop: suppliedHero,
  mobile: suppliedHero,
  thumbnail: alignAscii([
    '      ,,,,,       ',
    '   ,,,,,,,,,,,,   ',
    '  ,,,,,....,,,,,  ',
    '   ,,,......,,,   ',
    '     ,,,,,,,,     ',
  ]),
  columnLimits: {
    desktop: 100,
    mobile: 100,
  },
};
