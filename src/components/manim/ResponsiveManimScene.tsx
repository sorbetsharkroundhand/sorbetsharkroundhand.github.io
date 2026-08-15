import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Scene } from 'manim-web';

import { ManimErrorBoundary } from './ManimErrorBoundary';
import './responsive-manim-scene.css';

export interface SceneDisposable {
  dispose(): void;
}

export interface SceneSetupContext {
  scene: Scene;
  registerDisposable(disposable: SceneDisposable): void;
}

export type SceneCleanup = () => void;
export type SceneSetup = (
  context: SceneSetupContext,
) => void | SceneCleanup | Promise<void | SceneCleanup>;

export interface ResponsiveManimSceneProps {
  setup: SceneSetup;
  ariaLabel: string;
  backgroundColor?: string;
  className?: string;
  aspectRatio?: `${number} / ${number}`;
}

const fallbackCopy =
  '이 인터랙티브 그래프를 표시하지 못했습니다. 본문과 수식은 계속 읽을 수 있습니다.';

type SceneStatus = 'loading' | 'ready' | 'error';

interface SceneFrameProps {
  ariaLabel: string;
  aspectRatio: `${number} / ${number}`;
  className?: string;
  containerRef?: RefObject<HTMLDivElement | null>;
  status: SceneStatus;
}

function runSafely(callback: () => void) {
  try {
    callback();
  } catch {
    // Cleanup errors must not leave the remaining resources undisposed.
  }
}

function isSetupPromise(
  result: void | SceneCleanup | Promise<void | SceneCleanup>,
): result is Promise<void | SceneCleanup> {
  return typeof result === 'object' && result !== null && 'then' in result;
}

function SceneFrame({
  ariaLabel,
  aspectRatio,
  className,
  containerRef,
  status,
}: SceneFrameProps) {
  const frameStyle = {
    '--responsive-manim-aspect-ratio': aspectRatio,
  } as CSSProperties;
  const rootClassName = className
    ? `responsive-manim-scene ${className}`
    : 'responsive-manim-scene';

  return (
    <div className={rootClassName}>
      <div className="responsive-manim-scene__frame" style={frameStyle}>
        <div
          aria-label={ariaLabel}
          className="responsive-manim-scene__canvas"
          ref={containerRef}
          role="img"
        />
      </div>
      {status === 'loading' ? (
        <p aria-live="polite" className="responsive-manim-scene__status" role="status">
          그래프를 준비하고 있습니다.
        </p>
      ) : null}
      {status === 'error' ? (
        <p aria-live="assertive" className="responsive-manim-scene__fallback" role="alert">
          {fallbackCopy}
        </p>
      ) : null}
    </div>
  );
}

function ResponsiveManimSceneFallback({
  ariaLabel,
  aspectRatio = '12 / 7.5',
}: Pick<ResponsiveManimSceneProps, 'ariaLabel' | 'aspectRatio'>) {
  return <SceneFrame ariaLabel={ariaLabel} aspectRatio={aspectRatio} status="error" />;
}

function ResponsiveManimSceneContent({
  ariaLabel,
  aspectRatio = '12 / 7.5',
  backgroundColor = '#f7f6f1',
  className,
  setup,
}: ResponsiveManimSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lifecycle, setLifecycle] = useState(() => ({ setup, status: 'loading' as SceneStatus }));

  if (lifecycle.setup !== setup) {
    setLifecycle({ setup, status: 'loading' });
  }

  const status = lifecycle.status;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;
    let cleanup: SceneCleanup | undefined;
    let scene: Scene | undefined;
    let resourcesDisposed = false;
    const disposables = new Set<SceneDisposable>();
    const disposedDisposables = new Set<SceneDisposable>();

    const disposeDisposable = (disposable: SceneDisposable) => {
      if (disposedDisposables.has(disposable)) {
        return;
      }

      disposedDisposables.add(disposable);
      runSafely(() => disposable.dispose());
    };

    const disposeResources = () => {
      if (resourcesDisposed) {
        return;
      }

      resourcesDisposed = true;

      if (cleanup) {
        const featureCleanup = cleanup;
        cleanup = undefined;
        runSafely(featureCleanup);
      }

      for (const disposable of [...disposables].reverse()) {
        disposeDisposable(disposable);
      }
      disposables.clear();

      if (scene) {
        const activeScene = scene;
        scene = undefined;
        runSafely(() => activeScene.dispose());
      }
    };

    const registerDisposable = (disposable: SceneDisposable) => {
      if (resourcesDisposed) {
        disposeDisposable(disposable);
        return;
      }

      disposables.add(disposable);
    };

    const updateStatus = (nextStatus: SceneStatus) => {
      setLifecycle((current) =>
        current.setup === setup ? { ...current, status: nextStatus } : current,
      );
    };

    const finishSetup = (result: void | SceneCleanup) => {
      if (cancelled) {
        if (result) {
          runSafely(result);
        }
        return;
      }

      cleanup = result ?? undefined;
      updateStatus('ready');
    };

    const failSetup = () => {
      if (cancelled) {
        return;
      }

      disposeResources();
      updateStatus('error');
    };

    try {
      scene = new Scene(container, {
        backgroundColor,
        backgroundOpacity: 1,
        frameWidth: 12,
        frameHeight: 7.5,
        autoResize: true,
      });

      const result = setup({ scene, registerDisposable });
      if (isSetupPromise(result)) {
        void result.then(finishSetup, failSetup);
      } else {
        finishSetup(result);
      }
    } catch {
      failSetup();
    }

    return () => {
      cancelled = true;
      disposeResources();
    };
  }, [backgroundColor, setup]);

  return (
    <SceneFrame
      ariaLabel={ariaLabel}
      aspectRatio={aspectRatio}
      className={className}
      containerRef={containerRef}
      status={status}
    />
  );
}

export function ResponsiveManimScene(props: ResponsiveManimSceneProps) {
  return (
    <ManimErrorBoundary
      fallback={
        <ResponsiveManimSceneFallback
          ariaLabel={props.ariaLabel}
          aspectRatio={props.aspectRatio}
        />
      }
      resetKey={props.setup}
    >
      <ResponsiveManimSceneContent {...props} />
    </ManimErrorBoundary>
  );
}
