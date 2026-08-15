import { alignAscii, type AsciiArtEntry } from './types';

export const statisticsArt: AsciiArtEntry = {
  id: 'category-statistics',
  label: '표본 분포와 평균을 나타내는 막대 그래프',
  desktop: alignAscii([
    ' frequency',
    ' |                 ##',
    ' |             ##  ##  ##',
    ' |         ##  ##  ##  ##',
    ' |     ##  ##  ##  ##  ##  ##',
    ' +-------------------------------- value',
    '                   ^ mean',
  ]),
  mobile: alignAscii([
    ' f',
    ' |        ##',
    ' |    ##  ##  ##',
    ' | ## ##  ##  ## ##',
    ' +---------------- v',
    '          ^ mean',
  ]),
  thumbnail: alignAscii([
    ' |    ##',
    ' | ## ## ##',
    ' | ## ## ## ##',
    ' +-----------',
  ]),
};

export const notebookDefaultArt: AsciiArtEntry = {
  id: 'notebook-default',
  label: '격자 위에 펼쳐진 수학 학습 노트',
  desktop: alignAscii([
    '+------------------------------------------------+',
    '| NOTE                                           |',
    '| 001   definition                               |',
    '|       --------------------------------------   |',
    '|       f(x) = observation + model + error       |',
    '|       --------------------------------------   |',
    '|                              [study -> apply]   |',
    '+------------------------------------------------+',
  ]),
  mobile: alignAscii([
    '+--------------------------+',
    '| NOTE 001                 |',
    '| definition               |',
    '| ------------------------ |',
    '| f(x) = model + error     |',
    '+--------------------------+',
  ]),
  thumbnail: alignAscii([
    '+------------------+',
    '| NOTE 001         |',
    '| f(x) = m + e     |',
    '+------------------+',
  ]),
};
