import { alignAscii, type AsciiArtEntry } from './types';

export const siteHeroArt: AsciiArtEntry = {
  id: 'site-hero',
  label: '좌표계 위에 겹쳐진 학습 노트와 상승하는 회귀선',
  desktop: alignAscii([
    '      y',
    '      |                         o',
    '      |                    o  /',
    ' NOTE |  +------------------/------+',
    '  001 |  |  hypothesis    /       |',
    '      |  |       o       /        |',
    '      |  |    o         /         |',
    '      |  | o           /          |',
    '      |  +------------/-----------+',
    '      +-------------------------------- x',
  ]),
  mobile: alignAscii([
    ' y',
    ' |              o',
    ' | +----------/---+',
    ' | | NOTE 001/    |',
    ' | |   o   /      |',
    ' | | o    /       |',
    ' | +-----/--------+',
    ' +---------------- x',
  ]),
  thumbnail: alignAscii([
    ' y        o',
    ' | +----/--+',
    ' | | o /   |',
    ' | +--/----+',
    ' +---------x',
  ]),
};
