// @vitest-environment happy-dom
import { StrictMode, type CSSProperties } from 'react';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeController {
  dispose: ReturnType<typeof vi.fn>;
  resize: ReturnType<typeof vi.fn>;
  setPointer: ReturnType<typeof vi.fn>;
  setProgress: ReturnType<typeof vi.fn>;
}

const visualHarness = vi.hoisted(() => ({
  asciiCreate: vi.fn(),
  topologyCreate: vi.fn(),
}));

vi.mock('./homeVisualLoaders', () => ({
  createHomeAscii: (...args: unknown[]) => visualHarness.asciiCreate(...args),
  createHomeTopology: (...args: unknown[]) => visualHarness.topologyCreate(...args),
}));

import { HomeManimScene } from './HomeManimScene';

function createController(): FakeController {
  return {
    dispose: vi.fn(),
    resize: vi.fn(),
    setPointer: vi.fn(),
    setProgress: vi.fn(),
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function installResizeObserver() {
  const instances: Array<{
    callback: ResizeObserverCallback;
    disconnect: ReturnType<typeof vi.fn>;
    observe: ReturnType<typeof vi.fn>;
  }> = [];
  vi.stubGlobal(
    'ResizeObserver',
    class FakeResizeObserver {
      readonly disconnect = vi.fn();
      readonly observe = vi.fn();

      constructor(readonly callback: ResizeObserverCallback) {
        instances.push(this);
      }
    },
  );
  return instances;
}

function installAnimationFrames() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId;
    nextId += 1;
    callbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  return {
    callbacks,
    flush() {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(0));
    },
  };
}

function setDevicePixelRatio(value: number) {
  vi.stubGlobal('devicePixelRatio', value);
}

function renderScene(strict = false, initialProgress = 0) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 844,
    height: 844,
    left: 0,
    right: 390,
    toJSON: () => ({}),
    top: 0,
    width: 390,
    x: 0,
    y: 0,
  });
  const element = (
    <section data-home-scrolly="" style={{ '--home-progress': initialProgress } as CSSProperties}>
      <div className="home-scrolly__visual">
        <HomeManimScene />
      </div>
    </section>
  );
  const view = render(strict ? <StrictMode>{element}</StrictMode> : element);
  const story = view.container.querySelector<HTMLElement>('[data-home-scrolly]')!;
  const shell = view.container.querySelector<HTMLElement>('.home-scrolly__visual')!;
  const visual = view.container.querySelector<HTMLElement>('[data-home-visuals]')!;
  return { shell, story, view, visual };
}

function dispatchProgress(root: HTMLElement, progress: number) {
  root.dispatchEvent(
    new CustomEvent('home-scrolly:progress', {
      bubbles: true,
      detail: {
        state: {
          asciiOpacity: 1,
          cameraDistance: 12,
          cameraPhi: 1,
          cameraTheta: 0,
          chapter: 'dissolution',
          indexOpacity: 0,
          progress,
          statementOpacity: 0,
          surfaceAmplitude: 1,
          surfaceFrequency: 1,
          topologyOpacity: 0.5,
        },
      },
    }),
  );
}

beforeEach(() => {
  installResizeObserver();
  installAnimationFrames();
  setDevicePixelRatio(3);
  visualHarness.asciiCreate.mockReset();
  visualHarness.topologyCreate.mockReset();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('HomeManimScene', () => {
  it('replays the newest progress after asynchronous topology creation', async () => {
    const deferred = createDeferred<FakeController>();
    const topology = createController();
    const ascii = createController();
    visualHarness.topologyCreate.mockReturnValue(deferred.promise);
    visualHarness.asciiCreate.mockReturnValue(ascii);
    const { story, visual } = renderScene();
    fireEvent.scroll(window);

    dispatchProgress(story, 0.2);
    dispatchProgress(story, 0.68);
    deferred.resolve(topology);

    await waitFor(() => expect(visual.dataset.topologyStatus).toBe('ready'));
    expect(topology.setProgress).toHaveBeenLastCalledWith(0.68);
    expect(ascii.setProgress).toHaveBeenLastCalledWith(0.68);
  });

  it('defers topology creation until the first engagement and hydrates it afterwards', async () => {
    const topology = createController();
    const ascii = createController();
    visualHarness.topologyCreate.mockResolvedValue(topology);
    visualHarness.asciiCreate.mockReturnValue(ascii);
    const { story, visual } = renderScene();

    expect(visualHarness.topologyCreate).not.toHaveBeenCalled();
    await waitFor(() => expect(visual.dataset.asciiStatus).toBe('ready'));

    dispatchProgress(story, 0.4);
    expect(topology.setProgress).not.toHaveBeenCalled();

    fireEvent.scroll(window);
    await waitFor(() => expect(visual.dataset.topologyStatus).toBe('ready'));
    expect(topology.setProgress).toHaveBeenLastCalledWith(0.4);
  });

  it('starts the topology when hydration lands after an earlier scroll', async () => {
    const topology = createController();
    const ascii = createController();
    visualHarness.topologyCreate.mockResolvedValue(topology);
    visualHarness.asciiCreate.mockReturnValue(ascii);
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(24);
    const { visual } = renderScene();

    await waitFor(() => expect(visual.dataset.topologyStatus).toBe('ready'));
    expect(visualHarness.topologyCreate).toHaveBeenCalledTimes(1);
  });

  it('hydrates from the progress already projected by the scroll mount', async () => {
    const topology = createController();
    const ascii = createController();
    visualHarness.topologyCreate.mockResolvedValue(topology);
    visualHarness.asciiCreate.mockReturnValue(ascii);
    const { visual } = renderScene(false, 0.68);

    await waitFor(() => expect(visual.dataset.topologyStatus).toBe('ready'));

    expect(topology.setProgress).toHaveBeenLastCalledWith(0.68);
    expect(ascii.setProgress).toHaveBeenLastCalledWith(0.68);
  });

  it('measures both controllers with the mobile pixel-ratio cap', async () => {
    const topology = createController();
    const ascii = createController();
    visualHarness.topologyCreate.mockResolvedValue(topology);
    visualHarness.asciiCreate.mockReturnValue(ascii);
    const { visual } = renderScene();
    fireEvent.scroll(window);

    await waitFor(() => expect(visual.dataset.topologyStatus).toBe('ready'));

    expect(visualHarness.topologyCreate).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        height: 844,
        mobile: true,
        pixelRatio: 1.25,
        width: 390,
      }),
    );
    expect(ascii.resize).toHaveBeenCalledWith(390, 844, 1.25);
    expect(topology.resize).toHaveBeenCalledWith(390, 844, 1.25);
  });

  it('keeps topology ready when only ASCII initialization fails', async () => {
    const topology = createController();
    visualHarness.topologyCreate.mockResolvedValue(topology);
    visualHarness.asciiCreate.mockImplementation(() => {
      throw new Error('2D canvas context unavailable');
    });
    const { shell, visual } = renderScene();
    fireEvent.scroll(window);

    await waitFor(() => expect(visual.dataset.topologyStatus).toBe('ready'));
    await waitFor(() => expect(visual.dataset.asciiStatus).toBe('error'));

    expect(shell.dataset.topologyStatus).toBe('ready');
    expect(shell.dataset.asciiStatus).toBe('error');
    expect(visual.getAttribute('aria-hidden')).toBe('true');
  });

  it('marks only topology as failed when WebGL creation rejects', async () => {
    const ascii = createController();
    visualHarness.asciiCreate.mockReturnValue(ascii);
    visualHarness.topologyCreate.mockRejectedValue(new Error('WebGL unavailable'));
    const { shell, visual } = renderScene();
    fireEvent.scroll(window);

    await waitFor(() => expect(visual.dataset.topologyStatus).toBe('error'));
    await waitFor(() => expect(visual.dataset.asciiStatus).toBe('ready'));

    expect(shell.dataset.topologyStatus).toBe('error');
    expect(shell.dataset.asciiStatus).toBe('ready');
    expect(visual.querySelector('[role="alert"]')).toBeNull();
  });

  it('pauses visual delivery while hidden and replays the latest state on return', async () => {
    let visibility: DocumentVisibilityState = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    const topology = createController();
    const ascii = createController();
    visualHarness.topologyCreate.mockResolvedValue(topology);
    visualHarness.asciiCreate.mockReturnValue(ascii);
    const { story, visual } = renderScene();
    fireEvent.scroll(window);
    await waitFor(() => expect(visual.dataset.topologyStatus).toBe('ready'));
    topology.setProgress.mockClear();
    ascii.setProgress.mockClear();

    visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    dispatchProgress(story, 0.74);

    expect(topology.setProgress).not.toHaveBeenCalled();
    expect(ascii.setProgress).not.toHaveBeenCalled();

    visibility = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));

    expect(topology.setProgress).toHaveBeenLastCalledWith(0.74);
    expect(ascii.setProgress).toHaveBeenLastCalledWith(0.74);
  });

  it('coalesces pointer movement and disposes resources under Strict Mode', async () => {
    const frames = installAnimationFrames();
    const controllers: FakeController[] = [];
    visualHarness.topologyCreate.mockImplementation(async () => {
      const controller = createController();
      controllers.push(controller);
      return controller;
    });
    visualHarness.asciiCreate.mockImplementation(() => {
      const controller = createController();
      controllers.push(controller);
      return controller;
    });
    const { view, visual } = renderScene(true);
    fireEvent.scroll(window);
    await waitFor(() => expect(visualHarness.topologyCreate).toHaveBeenCalled());
    await waitFor(() => expect(visualHarness.asciiCreate).toHaveBeenCalled());
    await waitFor(() => expect(visual.dataset.topologyStatus).toBe('ready'));
    const activeControllers = controllers.filter(
      (controller) => !controller.dispose.mock.calls.length,
    );
    activeControllers.forEach((controller) => {
      controller.setPointer.mockClear();
      controller.setProgress.mockClear();
    });

    fireEvent.pointerMove(visual, { clientX: 100, clientY: 200 });
    fireEvent.pointerMove(visual, { clientX: 140, clientY: 240 });

    expect(frames.callbacks.size).toBe(1);
    act(() => frames.flush());
    activeControllers.forEach((controller) => {
      expect(controller.setPointer).toHaveBeenCalledTimes(1);
      expect(controller.setProgress).toHaveBeenCalledTimes(1);
    });

    view.unmount();
    controllers.forEach((controller) => {
      expect(controller.dispose).toHaveBeenCalledTimes(1);
    });
  });
});
