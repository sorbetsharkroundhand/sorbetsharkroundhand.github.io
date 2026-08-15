import { alignAscii, type AsciiArtEntry } from './types';

export const linearRegressionArt: AsciiArtEntry = {
  id: 'linear-regression',
  label: '관측점 사이를 통과하는 선형회귀 직선과 잔차선',
  desktop: alignAscii([
    ' y',
    ' |                                      o',
    ' |                                  :  /',
    ' |                           o      : /',
    ' |                           :     /',
    ' |                    o      :   /',
    ' |                    :        /',
    ' |             o      :      /',
    ' |        o    :           /',
    ' |   o    :              /',
    ' +---------------------------------------------- x',
    '       observed   / fitted line   : residual',
  ]),
  mobile: alignAscii([
    ' y',
    ' |                    o',
    ' |             o     : /',
    ' |             :    /',
    ' |       o     :  /',
    ' |   o   :      /',
    ' | o :        /',
    ' +---------------------- x',
  ]),
  thumbnail: alignAscii([
    ' y          o',
    ' |      o  :/',
    ' |  o  :  /',
    ' | o:   /',
    ' +----------x',
  ]),
};
