// @vitest-environment happy-dom
import { StrictMode } from 'react';
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

function getFrame(label: string) {
  const graph = screen.getByRole('img', { name: label });
  const frame = graph.parentElement;

  expect(frame?.classList.contains('responsive-manim-scene__frame')).toBe(true);

  return { frame: frame!, graph };
}

function expectFallbackFrame(label: string, aspectRatio = '12 / 7.5') {
  const { frame, graph } = getFrame(label);
  const fallback = screen.getByRole('alert');

  expect(frame.style.getPropertyValue('--responsive-manim-aspect-ratio')).toBe(aspectRatio);
  expect(fallback.textContent).toContain(fallbackCopy);
  expect(fallback.getAttribute('aria-live')).toBe('assertive');
  expect(graph.contains(fallback)).toBe(false);

  return { frame, graph };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
        backgroundColor="#090a0a"
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
      backgroundColor: '#090a0a',
      backgroundOpacity: 1,
      frameHeight: 7.5,
      frameWidth: 12,
    });
    expect(record.options).not.toHaveProperty('height');
    expect(record.options).not.toHaveProperty('width');
    expect(screen.queryByRole('status')).toBeNull();
    getFrame('선형회귀 산점도');

    view.unmount();
  });

  it('starts a new loading lifecycle and disposes the previous scene when setup changes', async () => {
    const secondSetup = createDeferred<void>();
    const firstSetup = () => () => sceneHarness.events.push('first.feature.cleanup');

    const view = render(
      <ResponsiveManimScene ariaLabel="설정 변경 그래프" setup={firstSetup} />,
    );

    await waitFor(() => expect(sceneHarness.records).toHaveLength(1));
    view.rerender(
      <ResponsiveManimScene ariaLabel="설정 변경 그래프" setup={() => secondSetup.promise} />,
    );

    expect(screen.getByRole('status').textContent).toContain('그래프를 준비하고 있습니다');
    await waitFor(() => expect(sceneHarness.records).toHaveLength(2));
    expect(sceneHarness.records[0].disposeCount).toBe(1);
    expect(sceneHarness.events).toEqual(['first.feature.cleanup', 'scene.dispose']);

    await act(async () => {
      secondSetup.resolve();
      await secondSetup.promise;
    });

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    view.unmount();
  });

  it('keeps loading status outside the canvas until asynchronous setup completes', async () => {
    const deferred = createDeferred<void | (() => void)>();
    const view = render(
      <ResponsiveManimScene ariaLabel="로딩 중인 그래프" setup={() => deferred.promise} />,
    );

    const { graph } = getFrame('로딩 중인 그래프');
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

  it('disposes duplicate registrations only once while preserving reverse registration order', async () => {
    const duplicate = { dispose: () => sceneHarness.events.push('duplicate.handle') };
    const later = { dispose: () => sceneHarness.events.push('later.handle') };
    const view = render(
      <ResponsiveManimScene
        ariaLabel="중복 핸들 그래프"
        setup={({ registerDisposable }) => {
          registerDisposable(duplicate);
          registerDisposable(duplicate);
          registerDisposable(later);
        }}
      />,
    );

    await waitFor(() => expect(sceneHarness.records).toHaveLength(1));
    view.unmount();

    expect(sceneHarness.events).toEqual([
      'later.handle',
      'duplicate.handle',
      'scene.dispose',
    ]);
  });

  it('continues to dispose handles and the scene after feature cleanup throws', async () => {
    const view = render(
      <ResponsiveManimScene
        ariaLabel="정리 오류 그래프"
        setup={({ registerDisposable }) => {
          registerDisposable({ dispose: () => sceneHarness.events.push('handle.first') });
          registerDisposable({ dispose: () => sceneHarness.events.push('handle.second') });
          return () => {
            sceneHarness.events.push('feature.cleanup');
            throw new Error('cleanup failed');
          };
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
  });

  it('immediately disposes a handle registered after its lifecycle has ended', async () => {
    const received: { context?: SceneSetupContext } = {};
    const lateHandle = { dispose: () => sceneHarness.events.push('late.handle') };
    const view = render(
      <ResponsiveManimScene
        ariaLabel="늦은 핸들 그래프"
        setup={(context) => {
          received.context = context;
        }}
      />,
    );

    await waitFor(() => expect(received.context).toBeDefined());
    view.unmount();
    received.context!.registerDisposable(lateHandle);
    received.context!.registerDisposable(lateHandle);

    expect(sceneHarness.events).toEqual(['scene.dispose', 'late.handle']);
  });

  it('preserves the labelled frame and live fallback when scene construction fails', async () => {
    sceneHarness.constructorError = true;

    render(<ResponsiveManimScene ariaLabel="실패한 그래프" setup={() => undefined} />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expectFallbackFrame('실패한 그래프');
  });

  it('recovers from a constructor error when a new setup identity is provided', async () => {
    sceneHarness.constructorError = true;
    const view = render(
      <ResponsiveManimScene ariaLabel="복구되는 생성 그래프" setup={() => undefined} />,
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
    sceneHarness.constructorError = false;
    view.rerender(
      <ResponsiveManimScene ariaLabel="복구되는 생성 그래프" setup={() => undefined} />,
    );

    await waitFor(() => expect(sceneHarness.records).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    getFrame('복구되는 생성 그래프');
  });

  it('preserves the frame and disposes the scene when synchronous setup throws', async () => {
    render(
      <ResponsiveManimScene
        ariaLabel="동기 설정 오류 그래프"
        setup={() => {
          throw new Error('setup failed');
        }}
      />,
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(sceneHarness.records[0].disposeCount).toBe(1);
    expectFallbackFrame('동기 설정 오류 그래프');
  });

  it('recovers from a setup error when a new setup identity is provided', async () => {
    const view = render(
      <ResponsiveManimScene
        ariaLabel="복구되는 설정 그래프"
        setup={() => {
          throw new Error('setup failed');
        }}
      />,
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
    view.rerender(
      <ResponsiveManimScene ariaLabel="복구되는 설정 그래프" setup={() => undefined} />,
    );

    await waitFor(() => expect(sceneHarness.records).toHaveLength(2));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    getFrame('복구되는 설정 그래프');
  });

  it('preserves the frame and disposes the scene when asynchronous setup rejects', async () => {
    const deferred = createDeferred<void>();
    render(
      <ResponsiveManimScene
        ariaLabel="비동기 설정 오류 그래프"
        setup={() => deferred.promise}
      />,
    );

    await act(async () => {
      deferred.reject(new Error('setup failed'));
      try {
        await deferred.promise;
      } catch {
        // The component owns the rejected setup promise.
      }
    });

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(sceneHarness.records[0].disposeCount).toBe(1);
    expectFallbackFrame('비동기 설정 오류 그래프');
  });

  it('keeps its labelled frame and live fallback after an ErrorBoundary failure', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const brokenClassName = {
      toString() {
        throw new Error('render failed');
      },
    } as unknown as string;

    render(
      <ResponsiveManimScene
        ariaLabel="경계 오류 그래프"
        className={brokenClassName}
        setup={() => undefined}
      />,
    );

    expect(await screen.findByRole('alert')).toBeTruthy();
    expectFallbackFrame('경계 오류 그래프');
    consoleError.mockRestore();
  });

  it('does not override a custom aspect ratio with a minimum height', () => {
    render(
      <ResponsiveManimScene
        ariaLabel="사용자 비율 그래프"
        aspectRatio="3 / 2"
        setup={() => new Promise(() => undefined)}
      />,
    );

    const { frame } = getFrame('사용자 비율 그래프');
    expect(frame.style.getPropertyValue('--responsive-manim-aspect-ratio')).toBe('3 / 2');
    expect(getComputedStyle(frame).minHeight).toBe('');
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
});
