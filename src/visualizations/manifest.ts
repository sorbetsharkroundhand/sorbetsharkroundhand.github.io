export type AccentName = 'cyan' | 'red' | 'yellow' | 'violet';

export interface VisualizationPlacement {
  id: string;
  afterHeading: string;
  accent: AccentName;
  title: string;
  description: string;
}

export type VisualizationManifest = Record<string, readonly VisualizationPlacement[]>;

export const postVisualizations = {
  'linear-regression': [
    {
      id: 'linear-regression:model',
      afterHeading: '직접 움직여보기',
      accent: 'cyan',
      title: '선형 모델 조절',
      description: '기울기와 절편을 바꾸며 회귀선이 데이터에 맞춰지는 과정을 관찰합니다.',
    },
    {
      id: 'linear-regression:residuals',
      afterHeading: 'Residual Visualization',
      accent: 'red',
      title: '잔차 관찰',
      description: '관찰값과 예측값 사이의 세로 거리를 비교합니다.',
    },
    {
      id: 'linear-regression:best-fit',
      afterHeading: 'Find Best Fit',
      accent: 'yellow',
      title: '최적선 찾기',
      description: '평균제곱오차가 최소인 직선으로 이동하는 과정을 확인합니다.',
    },
  ],
} as const satisfies VisualizationManifest;
