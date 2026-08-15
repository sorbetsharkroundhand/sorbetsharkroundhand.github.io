import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import FigureButton from '../../controls/FigureButton';
import ParameterSlider from '../../controls/ParameterSlider';
import {
  ResponsiveManimScene,
  type SceneSetup,
} from '../../manim/ResponsiveManimScene';
import {
  INITIAL_PARAMETERS,
  STUDY_DATA,
  type RegressionParameters,
} from './regressionData';
import {
  LinearRegressionSceneController,
  type RegressionFrame,
  type RegressionFocus,
} from './LinearRegressionSceneController';
import { calculateLeastSquares, calculateMSE } from './regressionMath';
import type { AccentName } from '../../../visualizations/manifest';
import './linear-regression.css';

const BEST_FIT = calculateLeastSquares(STUDY_DATA);
const ANIMATION_DURATION_SECONDS = 1.1;

type FigureMessage =
  | '그래프 초기화 중입니다.'
  | '기울기와 절편을 조절해 보세요.'
  | '최적 직선을 찾는 중입니다.'
  | '최적 직선에 도착했습니다.'
  | '초기 직선으로 돌아왔습니다.';

interface FitQuality {
  label: '최적 적합' | '가까워짐' | '탐색 중';
  tone: 'optimal' | 'near' | 'exploring';
}

function getFitQuality(mse: number): FitQuality {
  if (mse <= 0.35) return { label: '최적 적합', tone: 'optimal' };
  if (mse <= 5) return { label: '가까워짐', tone: 'near' };
  return { label: '탐색 중', tone: 'exploring' };
}

function formatParameter(value: number): string {
  return value.toFixed(2);
}

const ACCENT_COLORS: Record<AccentName, string> = {
  cyan: '#23d5e8',
  red: '#ff665f',
  yellow: '#f2c94c',
  violet: '#a98bff',
};

const SCENE_COPY: Record<RegressionFocus, { label: string; title: string; description: string }> = {
  model: {
    label: '[MODEL SCENE]',
    title: '기울기와 절편으로 직선을 움직입니다',
    description: '회귀선만 청록색으로 표시됩니다. 두 값을 바꾸며 선의 위치를 비교해 보세요.',
  },
  residuals: {
    label: '[RESIDUAL SCENE]',
    title: '예측과 관찰의 거리를 확인합니다',
    description: '잔차만 빨간색으로 표시됩니다. 직선을 움직이며 각 세로 거리와 MSE를 비교해 보세요.',
  },
  'best-fit': {
    label: '[OPTIMIZATION SCENE]',
    title: '오차가 가장 작은 직선을 찾습니다',
    description: '최적선만 노란색으로 표시됩니다. 현재 위치에서 최소제곱 해로 이동해 보세요.',
  },
};

interface LinearRegressionDemoProps {
  focus?: RegressionFocus;
  accent?: AccentName;
}

export default function LinearRegressionDemo({
  focus = 'model',
  accent = 'cyan',
}: LinearRegressionDemoProps) {
  const [parameters, setParameters] = useState<RegressionParameters>({
    ...INITIAL_PARAMETERS,
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [message, setMessage] = useState<FigureMessage>('그래프 초기화 중입니다.');
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<LinearRegressionSceneController | null>(null);
  const parametersRef = useRef<RegressionParameters>(parameters);
  const mountedRef = useRef(false);

  const mse = useMemo(
    () => calculateMSE(STUDY_DATA, parameters.slope, parameters.intercept),
    [parameters],
  );
  const quality = getFitQuality(mse);
  const meterValue = Math.min(mse, 20);
  const meterStyle = {
    '--fit-meter-value': `${(meterValue / 20) * 100}%`,
    '--scene-accent': ACCENT_COLORS[accent],
  } as CSSProperties;
  const controlsDisabled = isAnimating || !isSceneReady;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  const commitParameters = useCallback((next: RegressionParameters) => {
    parametersRef.current = next;
    setParameters(next);
    controllerRef.current?.setParameters(next);
  }, []);

  const handleControllerFrame = useCallback((frame: RegressionFrame) => {
    const next = { slope: frame.slope, intercept: frame.intercept };
    parametersRef.current = next;
    setParameters(next);
  }, []);

  const setupScene = useCallback<SceneSetup>(
    async ({ scene }) => {
      const controller = await LinearRegressionSceneController.create(scene, {
        points: STUDY_DATA,
        initial: parametersRef.current,
        onFrame: handleControllerFrame,
        focus,
        palette: {
          foreground: '#f4f4f0',
          muted: '#6e716f',
          accent: ACCENT_COLORS[accent],
        },
      });

      controllerRef.current = controller;
      controller.setParameters(parametersRef.current);
      if (mountedRef.current) {
        setIsSceneReady(true);
        setMessage('기울기와 절편을 조절해 보세요.');
      }

      return () => {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
        controller.dispose();
        if (mountedRef.current) {
          setIsSceneReady(false);
        }
      };
    },
    [accent, focus, handleControllerFrame],
  );

  const handleSlopeChange = useCallback(
    (slope: number) => {
      const next = { ...parametersRef.current, slope };
      setError(null);
      setMessage('기울기와 절편을 조절해 보세요.');
      commitParameters(next);
    },
    [commitParameters],
  );

  const handleInterceptChange = useCallback(
    (intercept: number) => {
      const next = { ...parametersRef.current, intercept };
      setError(null);
      setMessage('기울기와 절편을 조절해 보세요.');
      commitParameters(next);
    },
    [commitParameters],
  );

  const handleReset = useCallback(() => {
    setError(null);
    setMessage('초기 직선으로 돌아왔습니다.');
    commitParameters({ ...INITIAL_PARAMETERS });
  }, [commitParameters]);

  const handleBestFit = useCallback(async () => {
    const controller = controllerRef.current;
    if (!controller || isAnimating) return;

    setError(null);
    setMessage('최적 직선을 찾는 중입니다.');
    setIsAnimating(true);

    try {
      await controller.animateTo(
        BEST_FIT,
        reducedMotion ? 0 : ANIMATION_DURATION_SECONDS,
      );
      if (!mountedRef.current || controllerRef.current !== controller) return;
      commitParameters(BEST_FIT);
      setMessage('최적 직선에 도착했습니다.');
    } catch {
      if (mountedRef.current) {
        setError('최적 직선을 표시하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      if (mountedRef.current) setIsAnimating(false);
    }
  }, [commitParameters, isAnimating, reducedMotion]);

  return (
    <figure
      aria-labelledby={`linear-regression-${focus}-figure-title`}
      className="linear-regression-demo"
      data-focus={focus}
      style={{ '--scene-accent': ACCENT_COLORS[accent] } as CSSProperties}
    >
      <header className="linear-regression-demo__header">
        <p className="linear-regression-demo__eyebrow">{SCENE_COPY[focus].label}</p>
        <h3 id={`linear-regression-${focus}-figure-title`}>{SCENE_COPY[focus].title}</h3>
        <p>{SCENE_COPY[focus].description}</p>
      </header>

      <div className="linear-regression-demo__instrument">
        <div className="linear-regression-demo__plot">
          <ResponsiveManimScene
            ariaLabel="공부 시간과 시험 점수, 회귀 직선, 세로 잔차를 나타낸 좌표 그래프"
            backgroundColor="#090a0a"
            setup={setupScene}
          />
          <div className="linear-regression-demo__plot-notes">
            <p className="linear-regression-demo__model" aria-label="예측값은 기울기 곱하기 공부 시간 더하기 절편">
              ŷ = wx + b
            </p>
            <div aria-label="그래프 선 범례" className="linear-regression-demo__legend">
              <p>
                <span className="linear-regression-demo__legend-model" aria-hidden="true" />
                thick sloped line = model
              </p>
              <p>
                <span className="linear-regression-demo__legend-residual" aria-hidden="true" />
                thin vertical line = residual
              </p>
            </div>
          </div>
        </div>

        <section
          aria-label="회귀 직선 조절 도구"
          className="linear-regression-demo__controls"
        >
          <div className="linear-regression-demo__control-heading">
            <p>Parameters</p>
            <span>{isAnimating ? 'Fitting' : isSceneReady ? 'Ready' : 'Loading'}</span>
          </div>

          <ParameterSlider
            disabled={controlsDisabled}
            formatValue={formatParameter}
            id={`${focus}-slope-slider`}
            label="기울기 w"
            max={8}
            min={2}
            onChange={handleSlopeChange}
            step={0.05}
            value={parameters.slope}
          />
          <ParameterSlider
            disabled={controlsDisabled}
            formatValue={formatParameter}
            id={`${focus}-intercept-slider`}
            label="절편 b"
            max={60}
            min={35}
            onChange={handleInterceptChange}
            step={0.25}
            value={parameters.intercept}
          />

          <div className="linear-regression-demo__readout">
            <div>
              <span id="mse-label">Mean squared error</span>
              <output aria-labelledby="mse-label" data-testid="mse-value">
                {mse.toFixed(3)}
              </output>
            </div>
            <div>
              <span id="fit-quality-label">Fit quality</span>
              <output
                aria-labelledby="fit-quality-label"
                className={`linear-regression-demo__quality linear-regression-demo__quality--${quality.tone}`}
                data-testid="fit-quality"
              >
                {quality.label}
              </output>
            </div>
            <div
              aria-labelledby="fit-quality-label"
              aria-valuemax={20}
              aria-valuemin={0}
              aria-valuenow={Number(meterValue.toFixed(3))}
              aria-valuetext={`${quality.label}, MSE ${mse.toFixed(3)}`}
              className={`linear-regression-demo__meter linear-regression-demo__meter--${quality.tone}`}
              role="meter"
              style={meterStyle}
            >
              <span />
            </div>
          </div>

          {focus === 'best-fit' ? (
            <div className="linear-regression-demo__actions">
              <FigureButton
                disabled={controlsDisabled}
                onClick={handleBestFit}
                testId="best-fit-button"
                variant="primary"
              >
                Find Best Fit
              </FigureButton>
              <FigureButton
                disabled={controlsDisabled}
                onClick={handleReset}
                testId="reset-button"
                variant="secondary"
              >
                Reset
              </FigureButton>
            </div>
          ) : null}

          <p
            aria-live="polite"
            className="linear-regression-demo__status"
            data-testid="figure-status"
            role="status"
          >
            {message}
          </p>
          {error ? (
            <p className="linear-regression-demo__error" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </div>

      <figcaption>
        점은 선형회귀의 작동 방식을 설명하기 위해 만든 8개의 교육용 데이터입니다. 실제 연구 자료나 인과관계의 증거가 아닙니다.
      </figcaption>
    </figure>
  );
}
