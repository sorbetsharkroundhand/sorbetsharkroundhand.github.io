import { alignAscii, type AsciiArtEntry } from './types';

export const notFoundArt: AsciiArtEntry = {
  id: 'not-found',
  label: '좌표계를 벗어나 찾을 수 없는 404 노트',
  desktop: alignAscii([
    ' y',
    ' |       ?                NOTE NOT FOUND',
    ' |             ?          ----------------',
    ' |    ?                   requested point:',
    ' |                        (4, 0, 4)',
    ' +---------------------------------------------- x',
  ]),
  mobile: alignAscii([
    ' y       ?',
    ' |   ?       NOTE',
    ' |           NOT FOUND',
    ' |       ?   (4,0,4)',
    ' +---------------- x',
  ]),
  thumbnail: alignAscii([
    ' ?   NOTE',
    '   4 0 4',
    ' NOT FOUND',
  ]),
};
