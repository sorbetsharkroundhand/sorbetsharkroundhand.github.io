// @vitest-environment happy-dom
import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

type SceneRecord = {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  disposeCount: number;
  options: Record<string, unknown>;
  scene: object;
};

const sceneHarness = vi.hoisted(() => ({
  constructorError: false,
  events: [] as string[],
  records: [] as SceneRecord[],
}));

vi.mock('manim-web', () => ({
  Scene: class FakeScene {
    private readonly record: SceneRecord;

    constructor(container: HTMLElement, options: Record<string, unknown>) {
      if (sceneHarness.constructorError) {
        throw new Error('WebGL unavailable');
      }

      const canvas = document.createElement('canvas');
      canvas.dataset.sceneCanvas = 'true';
      container.append(canvas);

      this.record = {
        canvas,
        container,
        disposeCount: 0,
        options,
        scene: this,
      };
      sceneHarness.records.push(this.record);
    }

    dispose() {
      this.record.disposeCount += 1;
      sceneHarness.events.push('scene.dispose');
      this.record.canvas.remove();
    }
  },
}));

import {
  ResponsiveManimScene,
  type SceneSetupContext,
} from './ResponsiveManimScene';
import { ManimErrorBoundary } from './ManimErrorBoundary';

const fallbackCopy =
  '이 인터랙티브 그래프를 표시하지 못했습니다. 본문과 수식은 계속 읽을 수 있습니다.';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

function ThrowDuringRender(): ReactNode {
  throw new Error('render failed');
}

afterEach(() => {
  cleanup();
  sceneHarness.constructorError = false;
  sceneHarness.events.splice(0);
  sceneHarness.records.splice(0);
});

describe('ResponsiveManimScene', () => {
  it('gives setup its scene and disposable registration context without fixed pixels', async () => {
    const received: { context?: SceneSetupContext } = {};

    const view = render(
      <ResponsiveManimScene
        ariaLabel="선형회귀 산점도"
        setup={(context) => {
          received.context = context;
        }}
      />,
    );

    await waitFor(() => expect(received.context).toBeDefined());

    const record = sceneHarness.records[0];
    const context = received.context!;
    expect(context.scene).toBe(record.scene);
    expect(context.registerDisposable).toEqual(expect.any(Function));
    expect(record.options).toMatchObject({
      autoResize: true,
      backgroundColor: '#f7f6f1',
      backgroundOpacity: 1,
      frameHeight: 7.5,
      frameWidth: 12,
    });
    expect(record.options).not.toHaveProperty('height');
    expect(record.options).not.toHaveProperty('width');
    expect(screen.getByRole('img', { name: '선형회귀 산점도' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();

    view.unmount();
  });

  it('keeps loading status outside the canvas until asynchronous setup completes', async () => {
    const deferred = createDeferred<void | (() => void)>();

    const view = render(
      <ResponsiveManimScene ariaLabel="로딩 중인 그래프" setup={() => deferred.promise} />,
    );

    const graph = screen.getByRole('img', { name: '로딩 중인 그래프' });
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('그래프를 준비하고 있습니다');
    expect(graph.contains(status)).toBe(false);

    await act(async () => {
      deferred.resolve();
      await deferred.promise;
    });

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    view.unmount();
  });

  it('cleans feature resources, registered handles in reverse, then the scene', async () => {
    const view = render(
      <ResponsiveManimScene
        ariaLabel="정리 순서 그래프"
        setup={({ registerDisposable }) => {
          registerDisposable({ dispose: () => sceneHarness.events.push('handle.first') });
          registerDisposable({ dispose: () => sceneHarness.events.push('handle.second') });
          return () => sceneHarness.events.push('feature.cleanup');
        }}
      />,
    );

    await waitFor(() => expect(sceneHarness.records).toHaveLength(1));
    view.unmount();

    expect(sceneHarness.events).toEqual([
      'feature.cleanup',
      'handle.second',
      'handle.first',
      'scene.dispose',
    ]);
    expect(sceneHarness.records[0].disposeCount).toBe(1);
  });

  it('renders the Korean fallback when scene construction fails', async () => {
    sceneHarness.constructorError = true;

    render(<ResponsiveManimScene ariaLabel="실패한 그래프" setup={() => undefined} />);

    expect(await screen.findByText(fallbackCopy)).toBeTruthy();
    expect(screen.queryByRole('img', { name: '실패한 그래프' })).toBeNull();
  });

  it('renders the Korean fallback when asynchronous setup rejects', async () => {
    render(
      <ResponsiveManimScene
        ariaLabel="실패한 설정 그래프"
        setup={() => Promise.reject(new Error('setup failed'))}
      />,
    );

    expect(await screen.findByText(fallbackCopy)).toBeTruthy();
  });

  it('runs late asynchronous feature cleanup after unmount without retaining the canvas', async () => {
    const deferred = createDeferred<() => void>();
    const view = render(
      <ResponsiveManimScene ariaLabel="늦게 준비되는 그래프" setup={() => deferred.promise} />,
    );

    await waitFor(() => expect(sceneHarness.records).toHaveLength(1));
    const container = sceneHarness.records[0].container;
    view.unmount();

    expect(sceneHarness.records[0].disposeCount).toBe(1);
    expect(container.querySelector('[data-scene-canvas="true"]')).toBeNull();

    await act(async () => {
      deferred.resolve(() => sceneHarness.events.push('late.feature.cleanup'));
      await deferred.promise;
    });

    await waitFor(() =>
      expect(sceneHarness.events).toEqual(['scene.dispose', 'late.feature.cleanup']),
    );
  });

  it('leaves no live scene or canvas through React StrictMode mounting and unmounting', async () => {
    const view = render(
      <StrictMode>
        <ResponsiveManimScene ariaLabel="엄격 모드 그래프" setup={() => undefined} />
      </StrictMode>,
    );

    await waitFor(() => expect(sceneHarness.records).toHaveLength(2));
    expect(sceneHarness.records[0].disposeCount).toBe(1);
    expect(sceneHarness.records[1].container.querySelectorAll('canvas')).toHaveLength(1);

    view.unmount();

    expect(sceneHarness.records.map((record) => record.disposeCount)).toEqual([1, 1]);
    expect(sceneHarness.records[1].container.querySelectorAll('canvas')).toHaveLength(0);
  });

  it('uses its error boundary to preserve nearby article content after a render error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <article>
        <p>이 문단은 계속 읽을 수 있습니다.</p>
        <ManimErrorBoundary fallback={<p>{fallbackCopy}</p>}>
          <ThrowDuringRender />
        </ManimErrorBoundary>
      </article>,
    );

    expect(screen.getByText('이 문단은 계속 읽을 수 있습니다.')).toBeTruthy();
    expect(screen.getByText(fallbackCopy)).toBeTruthy();
    consoleError.mockRestore();
  });
});
