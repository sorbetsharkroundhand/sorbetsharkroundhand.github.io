import {
  Axes,
  Dot,
  FunctionGraph,
  Group,
  Line,
  type Mobject,
  Scene,
} from 'manim-web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_PARAMETERS, STUDY_DATA } from './regressionData';
import {
  LinearRegressionSceneController,
  type RegressionFrame,
} from './LinearRegressionSceneController';

const mathTexBoundary = vi.hoisted(() => ({
  disposeCalls: 0,
  waitForRender: vi.fn<() => Promise<void>>(),
}));

vi.mock('manim-web', async (importOriginal) => {
  const actual = await importOriginal<typeof import('manim-web')>();

  class BoundaryMathTex extends actual.Group {
    constructor(_options: unknown) {
      super(new actual.Dot());
    }

    waitForRender(): Promise<void> {
      return mathTexBoundary.waitForRender();
    }

    override dispose(): void {
      mathTexBoundary.disposeCalls += 1;
      super.dispose();
    }
  }

  return { ...actual, MathTex: BoundaryMathTex };
});

function sceneFamily(scene: Scene): Mobject[] {
  return [...scene.mobjects].flatMap((mobject) => mobject.getFamily());
}

function exactInstances<T extends Mobject>(
  scene: Scene,
  constructor: abstract new (...args: never[]) => T,
): T[] {
  return sceneFamily(scene).filter(
    (mobject): mobject is T => mobject.constructor === constructor,
  );
}

async function createController(onFrame: (frame: RegressionFrame) => void) {
  const scene = Scene.createHeadless({ autoRender: false });
  const controller = await LinearRegressionSceneController.create(scene, {
    points: STUDY_DATA,
    initial: INITIAL_PARAMETERS,
    onFrame,
  });

  return { controller, scene };
}

interface RafHarness {
  callbacks: Map<number, FrameRequestCallback>;
  canceledCallbacks: FrameRequestCallback[];
  cancelFrame: ReturnType<typeof vi.fn>;
  flushFrame: (time?: number) => void;
  requestFrame: ReturnType<typeof vi.fn>;
}

function installRafHarness(): RafHarness {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const canceledCallbacks: FrameRequestCallback[] = [];
  const requestFrame = vi.fn((callback: FrameRequestCallback) => {
    const id = nextId;
    nextId += 1;
    callbacks.set(id, callback);
    return id;
  });
  const cancelFrame = vi.fn((id: number) => {
    const callback = callbacks.get(id);
    if (callback) canceledCallbacks.push(callback);
    callbacks.delete(id);
  });

  vi.stubGlobal('requestAnimationFrame', requestFrame);
  vi.stubGlobal('cancelAnimationFrame', cancelFrame);

  return {
    callbacks,
    canceledCallbacks,
    cancelFrame,
    requestFrame,
    flushFrame(time = performance.now()) {
      const frameCallbacks = [...callbacks.values()];
      callbacks.clear();
      frameCallbacks.forEach((callback) => callback(time));
    },
  };
}

async function waitForCondition(
  condition: () => boolean,
  description: string,
  timeoutMs = 1_000,
): Promise<void> {
  const startedAt = performance.now();
  while (!condition()) {
    if (performance.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

beforeEach(() => {
  mathTexBoundary.disposeCalls = 0;
  mathTexBoundary.waitForRender.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('LinearRegressionSceneController', () => {
  it('creates the immutable plot structure and reports the initial frame', async () => {
    const frames: RegressionFrame[] = [];
    const { controller, scene } = await createController((frame) => frames.push(frame));

    expect(exactInstances(scene, Axes)).toHaveLength(1);
    expect(exactInstances(scene, Dot)).toHaveLength(8);
    expect(exactInstances(scene, FunctionGraph)).toHaveLength(1);
    expect(exactInstances(scene, Line)).toHaveLength(8);

    const axes = exactInstances(scene, Axes)[0];
    expect(axes.getXRange()).toEqual([0, 9, 1]);
    expect(axes.getYRange()).toEqual([45, 95, 10]);
    expect(axes.getXLength()).toBe(10.2);
    expect(axes.getYLength()).toBe(5.8);
    expect(frames).toEqual([{ slope: 3.5, intercept: 52, mse: 20 }]);

    controller.dispose();
    scene.dispose();
  });

  it('uses the exact project palette for every plotted layer', async () => {
    const { controller, scene } = await createController(() => undefined);
    const axes = exactInstances(scene, Axes)[0];

    expect(axes.xAxis.color).toBe('#686d65');
    expect(axes.yAxis.color).toBe('#686d65');
    expect(exactInstances(scene, Dot).map((dot) => dot.color)).toEqual(
      Array(8).fill('#242722'),
    );
    expect(exactInstances(scene, FunctionGraph)[0].color).toBe('#465ee8');
    expect(exactInstances(scene, Line).map((line) => line.color)).toEqual(
      Array(8).fill('#d86558'),
    );

    controller.dispose();
    scene.dispose();
  });

  it('updates the stable graph and residual objects in place', async () => {
    const frames: RegressionFrame[] = [];
    const { controller, scene } = await createController((frame) => frames.push(frame));
    const graph = exactInstances(scene, FunctionGraph)[0];
    const residuals = exactInstances(scene, Line);
    const axes = exactInstances(scene, Axes)[0];

    frames.length = 0;
    controller.setParameters({ slope: 6, intercept: 44 });

    expect(exactInstances(scene, FunctionGraph)[0]).toBe(graph);
    expect(exactInstances(scene, Line)).toEqual(residuals);
    expect(graph.getFunction()(2)).toBe(56);
    expect(residuals[0].getStart()).toEqual(axes.coordsToPoint(1, 52));
    expect(residuals[0].getEnd()).toEqual(axes.coordsToPoint(1, 50));
    expect(frames).toEqual([{ slope: 6, intercept: 44, mse: 4.875 }]);

    controller.dispose();
    scene.dispose();
  });

  it('delivers throttled intermediate frames that match the refreshed geometry', async () => {
    const raf = installRafHarness();
    const frames: RegressionFrame[] = [];
    const deliveries: Array<{
      frame: RegressionFrame;
      graphYAtTwo: number;
      firstResidualEnd: [number, number, number];
    }> = [];
    let graph: FunctionGraph | undefined;
    let residuals: Line[] | undefined;
    let axes: Axes | undefined;
    const { controller, scene } = await createController((frame) => {
      frames.push(frame);
      if (!graph || !residuals || !axes) return;

      deliveries.push({
        frame,
        graphYAtTwo: graph.getFunction()(2),
        firstResidualEnd: residuals[0].getEnd(),
      });
    });
    graph = exactInstances(scene, FunctionGraph)[0];
    residuals = exactInstances(scene, Line);
    axes = exactInstances(scene, Axes)[0];
    frames.length = 0;

    const animation = controller.animateTo({ slope: 6, intercept: 44 }, 0.16);

    await waitForCondition(() => raf.callbacks.size === 1, 'the first browser callback');
    await new Promise((resolve) => setTimeout(resolve, 38));
    expect(raf.callbacks.size).toBe(1);
    expect(raf.requestFrame).toHaveBeenCalledTimes(1);
    raf.flushFrame();

    await waitForCondition(() => raf.callbacks.size === 1, 'the second browser callback');
    await new Promise((resolve) => setTimeout(resolve, 28));
    expect(raf.callbacks.size).toBe(1);
    expect(raf.requestFrame).toHaveBeenCalledTimes(2);
    raf.flushFrame();

    await waitForCondition(() => raf.callbacks.size === 1, 'a stale pending callback');
    const staleCallback = [...raf.callbacks.values()][0];
    await animation;

    expect(frames.length).toBeGreaterThanOrEqual(3);
    expect(frames.at(-1)).toEqual({ slope: 6, intercept: 44, mse: 4.875 });
    deliveries.forEach(({ frame, graphYAtTwo, firstResidualEnd }) => {
      expect(graphYAtTwo).toBeCloseTo(frame.slope * 2 + frame.intercept, 12);
      expect(firstResidualEnd).toEqual(
        axes?.coordsToPoint(1, frame.slope + frame.intercept),
      );
    });
    expect(raf.callbacks.size).toBe(0);
    expect(raf.cancelFrame).toHaveBeenCalled();

    const deliveredCount = frames.length;
    staleCallback(performance.now());
    expect(frames).toHaveLength(deliveredCount);

    controller.dispose();
    scene.dispose();
  });

  it('commits one exact final frame after a zero-duration animation', async () => {
    const frames: RegressionFrame[] = [];
    const requestFrame = vi.fn(() => 17);
    const cancelFrame = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestFrame);
    vi.stubGlobal('cancelAnimationFrame', cancelFrame);
    const { controller, scene } = await createController((frame) => frames.push(frame));
    const graph = exactInstances(scene, FunctionGraph)[0];
    const residuals = exactInstances(scene, Line);
    const renderSpy = vi.spyOn(scene, 'render');

    frames.length = 0;
    await controller.animateTo(
      {
        slope: 5.2023809523809526,
        intercept: 46.464285714285715,
      },
      0,
    );

    expect(frames).toEqual([
      {
        slope: 5.2023809523809526,
        intercept: 46.464285714285715,
        mse: 0.26934523809523886,
      },
    ]);
    expect(exactInstances(scene, FunctionGraph)[0]).toBe(graph);
    expect(exactInstances(scene, Line)).toEqual(residuals);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(cancelFrame).toHaveBeenCalledWith(17);

    controller.dispose();
    scene.dispose();
  });

  it('rolls back scene mutation when the initial onFrame callback throws', async () => {
    const scene = Scene.createHeadless({ autoRender: false });
    const clearSpy = vi.spyOn(scene, 'clear');
    const sceneDisposeSpy = vi.spyOn(scene, 'dispose');
    let dynamicGroup: Group | undefined;

    await expect(
      LinearRegressionSceneController.create(scene, {
        points: STUDY_DATA,
        initial: INITIAL_PARAMETERS,
        onFrame: () => {
          dynamicGroup = exactInstances(scene, Group).find((group) => group.hasUpdaters());
          throw new Error('initial frame failed');
        },
      }),
    ).rejects.toThrow('initial frame failed');

    expect(dynamicGroup?.getUpdaters()).toHaveLength(0);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledWith({ render: false });
    expect(scene.mobjects.size).toBe(0);
    expect(sceneDisposeSpy).not.toHaveBeenCalled();

    clearSpy.mockRestore();
    sceneDisposeSpy.mockRestore();
    scene.dispose();
  });

  it('rolls back scene and label resources when MathTex rendering rejects', async () => {
    mathTexBoundary.waitForRender.mockRejectedValueOnce(new Error('math render failed'));
    const scene = Scene.createHeadless({ autoRender: false });
    const headlessSpy = vi.spyOn(scene, 'isHeadless', 'get').mockReturnValue(false);
    const clearSpy = vi.spyOn(scene, 'clear');
    const sceneDisposeSpy = vi.spyOn(scene, 'dispose');

    await expect(
      LinearRegressionSceneController.create(scene, {
        points: STUDY_DATA,
        initial: INITIAL_PARAMETERS,
        onFrame: () => undefined,
      }),
    ).rejects.toThrow('math render failed');

    expect(mathTexBoundary.disposeCalls).toBe(1);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledWith({ render: false });
    expect(scene.mobjects.size).toBe(0);
    expect(sceneDisposeSpy).not.toHaveBeenCalled();

    headlessSpy.mockRestore();
    clearSpy.mockRestore();
    sceneDisposeSpy.mockRestore();
    scene.dispose();
  });

  it('cancels pending callbacks after animation rejection and disposal', async () => {
    const raf = installRafHarness();
    const frames: RegressionFrame[] = [];
    const { controller, scene } = await createController((frame) => frames.push(frame));
    const dynamicGroup = exactInstances(scene, Group).find((group) => group.hasUpdaters());
    const sceneDisposeSpy = vi.spyOn(scene, 'dispose');
    let rejectPlay: ((reason: Error) => void) | undefined;
    vi.spyOn(scene, 'play').mockImplementationOnce(() => {
      dynamicGroup?.update(1 / 60);
      return new Promise<void>((_resolve, reject) => {
        rejectPlay = reject;
      });
    });
    frames.length = 0;

    const animation = controller.animateTo({ slope: 6, intercept: 44 }, 0.2);
    await waitForCondition(() => raf.callbacks.size === 1, 'the rejected play callback');
    const staleCallback = [...raf.callbacks.values()][0];
    controller.dispose();
    rejectPlay?.(new Error('animation failed'));
    await expect(animation).rejects.toThrow('animation failed');

    expect(raf.callbacks.size).toBe(0);
    expect(raf.canceledCallbacks).toHaveLength(1);
    expect(frames).toHaveLength(0);

    const deliveredCount = frames.length;
    staleCallback(performance.now());
    expect(frames).toHaveLength(deliveredCount);
    expect(sceneDisposeSpy).not.toHaveBeenCalled();

    sceneDisposeSpy.mockRestore();
    scene.dispose();
  });

  it('disposes once without taking ownership of the scene', async () => {
    const { controller, scene } = await createController(() => undefined);
    const dynamicGroups = exactInstances(scene, Group).filter((group) => group.hasUpdaters());
    const clearSpy = vi.spyOn(scene, 'clear');
    const sceneDisposeSpy = vi.spyOn(scene, 'dispose');

    expect(dynamicGroups).toHaveLength(1);
    expect(dynamicGroups[0].getUpdaters()).toHaveLength(1);

    expect(() => {
      controller.dispose();
      controller.dispose();
    }).not.toThrow();

    expect(dynamicGroups[0].getUpdaters()).toHaveLength(0);
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(clearSpy).toHaveBeenCalledWith({ render: false });
    expect(scene.mobjects.size).toBe(0);
    expect(sceneDisposeSpy).not.toHaveBeenCalled();

    clearSpy.mockRestore();
    sceneDisposeSpy.mockRestore();
    scene.dispose();
  });
});
