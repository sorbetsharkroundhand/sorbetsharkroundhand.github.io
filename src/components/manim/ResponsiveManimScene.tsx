import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
  className?: string;
  aspectRatio?: `${number} / ${number}`;
}

const fallbackCopy =
  '이 인터랙티브 그래프를 표시하지 못했습니다. 본문과 수식은 계속 읽을 수 있습니다.';

function SceneFallback() {
  return <p className="responsive-manim-scene__fallback">{fallbackCopy}</p>;
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

function ResponsiveManimSceneContent({
  ariaLabel,
  aspectRatio = '12 / 7.5',
  className,
  setup,
}: ResponsiveManimSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let cancelled = false;
    let cleanup: SceneCleanup | undefined;
    let scene: Scene | undefined;
    let resourcesDisposed = false;
    const disposables: SceneDisposable[] = [];

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
        runSafely(() => disposable.dispose());
      }
      disposables.splice(0);

      if (scene) {
        const activeScene = scene;
        scene = undefined;
        runSafely(() => activeScene.dispose());
      }
    };

    const registerDisposable = (disposable: SceneDisposable) => {
      if (resourcesDisposed) {
        runSafely(() => disposable.dispose());
        return;
      }

      disposables.push(disposable);
    };

    const finishSetup = (result: void | SceneCleanup) => {
      if (cancelled) {
        if (result) {
          runSafely(result);
        }
        return;
      }

      cleanup = result ?? undefined;
      setStatus('ready');
    };

    const failSetup = () => {
      if (cancelled) {
        return;
      }

      disposeResources();
      setStatus('error');
    };

    try {
      scene = new Scene(container, {
        backgroundColor: '#f7f6f1',
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
  }, [setup]);

  if (status === 'error') {
    return <SceneFallback />;
  }

  const frameStyle = {
    '--responsive-manim-aspect-ratio': aspectRatio,
  } as CSSProperties;

  return (
    <div className={['responsive-manim-scene', className].filter(Boolean).join(' ')}>
      <div className="responsive-manim-scene__frame" style={frameStyle}>
        <div
          aria-label={ariaLabel}
          className="responsive-manim-scene__canvas"
          ref={containerRef}
          role="img"
        />
      </div>
      {status === 'loading' ? (
        <p className="responsive-manim-scene__status" role="status">
          그래프를 준비하고 있습니다.
        </p>
      ) : null}
    </div>
  );
}

export function ResponsiveManimScene(props: ResponsiveManimSceneProps) {
  return (
    <ManimErrorBoundary fallback={<SceneFallback />}>
      <ResponsiveManimSceneContent {...props} />
    </ManimErrorBoundary>
  );
}
