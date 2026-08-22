// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

const manimHarness = vi.hoisted(() => ({
  dots: [] as Array<{ options: Record<string, unknown> }>,
  scenes: [] as Array<{
    add: ReturnType<typeof vi.fn>;
    camera3D: { orbit: ReturnType<typeof vi.fn> };
    canvas: HTMLCanvasElement;
    clear: ReturnType<typeof vi.fn>;
    dispose: ReturnType<typeof vi.fn>;
    options: Record<string, unknown>;
    play: ReturnType<typeof vi.fn>;
    render: ReturnType<typeof vi.fn>;
    resize: ReturnType<typeof vi.fn>;
    setPixelRatio: ReturnType<typeof vi.fn>;
  }>,
  surfaces: [] as Array<{
    functions: Array<(u: number, v: number) => [number, number, number]>;
    options: Record<string, unknown> & {
      func: (u: number, v: number) => [number, number, number];
    };
    setFunc: ReturnType<typeof vi.fn>;
    setUResolution: ReturnType<typeof vi.fn>;
    setVResolution: ReturnType<typeof vi.fn>;
  }>,
  surfaceConstructorError: false,
}));

vi.mock('manim-web', () => ({
  Dot3D: class FakeDot3D {
    constructor(options: Record<string, unknown>) {
      manimHarness.dots.push({ options });
    }
  },
  Surface3D: class FakeSurface3D {
    constructor(
      options: Record<string, unknown> & {
        func: (u: number, v: number) => [number, number, number];
      },
    ) {
      if (manimHarness.surfaceConstructorError) {
        throw new Error('surface construction failed');
      }
      const record = {
        functions: [] as Array<(u: number, v: number) => [number, number, number]>,
        options,
        setFunc: vi.fn((func: (u: number, v: number) => [number, number, number]) => {
          record.functions.push(func);
          return this;
        }),
        setUResolution: vi.fn(() => this),
        setVResolution: vi.fn(() => this),
      };
      manimHarness.surfaces.push(record);
      return Object.assign(this, record);
    }
  },
  ThreeDAxes: class FakeThreeDAxes {
    constructor(readonly options: Record<string, unknown>) {}
  },
  ThreeDScene: class FakeThreeDScene {
    readonly add = vi.fn();
    readonly camera3D = { orbit: vi.fn() };
    readonly canvas = document.createElement('canvas');
    readonly clear = vi.fn();
    readonly dispose = vi.fn();
    readonly play = vi.fn();
    readonly render = vi.fn();
    readonly resize = vi.fn();
    readonly setPixelRatio = vi.fn();
    readonly renderer = {
      getThreeRenderer: () => ({ setPixelRatio: this.setPixelRatio }),
    };

    constructor(container: HTMLElement, readonly options: Record<string, unknown>) {
      container.append(this.canvas);
      manimHarness.scenes.push(this);
    }

    getCanvas() {
      return this.canvas;
    }
  },
}));

import { HomeTopologyController } from './HomeTopologyController';

async function createController(
  overrides: Partial<Parameters<typeof HomeTopologyController.create>[1]> = {},
) {
  const container = document.createElement('div');
  document.body.append(container);
  const onFailure = vi.fn();
  const controller = await HomeTopologyController.create(container, {
    height: 900,
    mobile: false,
    onFailure,
    pixelRatio: 3,
    width: 1440,
    ...overrides,
  });
  const scene = manimHarness.scenes.at(-1)!;
  const surface = manimHarness.surfaces.at(-1)!;
  return { container, controller, onFailure, scene, surface };
}

afterEach(() => {
  document.body.replaceChildren();
  manimHarness.dots.splice(0);
  manimHarness.scenes.splice(0);
  manimHarness.surfaces.splice(0);
  manimHarness.surfaceConstructorError = false;
  vi.restoreAllMocks();
});

describe('HomeTopologyController', () => {
  it('constructs a restrained desktop scene without orbit interaction', async () => {
    const { controller, scene, surface } = await createController();

    expect(scene.options).toMatchObject({
      autoResize: false,
      backgroundColor: '#0a0a0a',
      backgroundOpacity: 0,
      enableOrbitControls: false,
    });
    expect(scene.setPixelRatio).toHaveBeenCalledWith(1.75);
    expect(surface.options).toMatchObject({
      color: '#efede6',
      opacity: 0.72,
      uResolution: 18,
      vResolution: 18,
      wireframe: true,
    });
    expect(scene.add).toHaveBeenCalledTimes(1);
    expect(manimHarness.dots.length).toBeGreaterThan(0);

    controller.dispose();
  });

  it('uses the lower mobile surface resolution and pixel ratio', async () => {
    const { controller, scene, surface } = await createController({
      height: 844,
      mobile: true,
      pixelRatio: 3,
      width: 390,
    });

    expect(scene.setPixelRatio).toHaveBeenCalledWith(1.25);
    expect(surface.options.uResolution).toBe(12);
    expect(surface.options.vResolution).toBe(12);

    controller.dispose();
  });

  it('updates geometry and camera once without using scene.play', async () => {
    const { controller, scene, surface } = await createController();
    scene.render.mockClear();

    controller.setProgress(0.25);

    expect(surface.setFunc).toHaveBeenCalledTimes(1);
    expect(scene.camera3D.orbit).toHaveBeenCalledTimes(1);
    expect(scene.render).toHaveBeenCalledTimes(1);
    expect(scene.play).not.toHaveBeenCalled();

    controller.setProgress(0.25);
    expect(surface.setFunc).toHaveBeenCalledTimes(1);
    expect(scene.render).toHaveBeenCalledTimes(1);

    controller.dispose();
  });

  it('skips sub-threshold progress drift to avoid redundant geometry rebuilds', async () => {
    const { controller, scene, surface } = await createController();
    scene.render.mockClear();

    controller.setProgress(0.25);
    controller.setProgress(0.2505);
    controller.setProgress(0.2515);

    expect(surface.setFunc).toHaveBeenCalledTimes(1);
    expect(scene.render).toHaveBeenCalledTimes(1);

    controller.setProgress(0.26);
    expect(surface.setFunc).toHaveBeenCalledTimes(2);
    expect(scene.render).toHaveBeenCalledTimes(2);

    controller.dispose();
  });

  it('does not rebuild hidden topology geometry', async () => {
    const { controller, scene, surface } = await createController();
    scene.render.mockClear();

    controller.setProgress(0.9);

    expect(surface.setFunc).not.toHaveBeenCalled();
    expect(scene.render).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('reconstructs the same surface and camera after reverse progress', async () => {
    const { controller, scene, surface } = await createController();
    controller.setPointer(0.35, 0.7, true);
    controller.setProgress(0.25);
    const firstFunction = surface.functions.at(-1)!;
    const firstPoint = firstFunction(0.8, -0.4);
    const firstCamera = scene.camera3D.orbit.mock.calls.at(-1);

    controller.setProgress(0.7);
    controller.setProgress(0.25);
    const restoredFunction = surface.functions.at(-1)!;

    expect(restoredFunction(0.8, -0.4)).toEqual(firstPoint);
    expect(scene.camera3D.orbit.mock.calls.at(-1)).toEqual(firstCamera);
    controller.dispose();
  });

  it('stores equal pointer input without rendering before the next sample', async () => {
    const { controller, scene, surface } = await createController();
    controller.setProgress(0.25);
    const beforePointer = surface.functions.at(-1)!(0, 0);
    scene.render.mockClear();
    surface.setFunc.mockClear();

    controller.setPointer(0.5, 0.5, true);

    expect(surface.setFunc).not.toHaveBeenCalled();
    expect(scene.render).not.toHaveBeenCalled();
    controller.setProgress(0.25);
    const afterPointer = surface.functions.at(-1)!(0, 0);
    expect(afterPointer).not.toEqual(beforePointer);
    controller.dispose();
  });

  it('reapplies the capped ratio after scene resize and renders the resized buffer', async () => {
    const { controller, scene } = await createController();
    const order: string[] = [];
    scene.setPixelRatio.mockImplementation(() => order.push('pixelRatio'));
    scene.resize.mockImplementation(() => order.push('resize'));
    scene.render.mockImplementation(() => order.push('render'));

    controller.resize(1440, 900, 3);

    expect(scene.setPixelRatio).toHaveBeenCalledWith(1.75);
    expect(scene.resize).toHaveBeenCalledWith(1440, 900);
    expect(order).toEqual(['resize', 'pixelRatio', 'render']);
    controller.dispose();
  });

  it('updates quality policy when a mobile scene crosses the desktop breakpoint', async () => {
    const { controller, scene, surface } = await createController({ mobile: true, width: 390 });
    scene.setPixelRatio.mockClear();

    controller.resize(1440, 900, 3);

    expect(scene.setPixelRatio).toHaveBeenLastCalledWith(1.75);
    expect(surface.setUResolution).toHaveBeenLastCalledWith(18);
    expect(surface.setVResolution).toHaveBeenLastCalledWith(18);
    controller.dispose();
  });

  it('reports context loss once and disposes every owned resource once', async () => {
    const { controller, onFailure, scene } = await createController();
    const event = new Event('webglcontextlost', { cancelable: true });

    scene.canvas.dispatchEvent(event);
    scene.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));

    expect(event.defaultPrevented).toBe(true);
    expect(onFailure).toHaveBeenCalledTimes(1);

    controller.dispose();
    controller.dispose();
    controller.setProgress(0.25);

    expect(scene.clear).toHaveBeenCalledTimes(1);
    expect(scene.clear).toHaveBeenCalledWith({ render: false });
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });

  it('releases the scene when mobject construction fails', async () => {
    const container = document.createElement('div');
    manimHarness.surfaceConstructorError = true;

    await expect(
      HomeTopologyController.create(container, {
        height: 900,
        mobile: false,
        onFailure: vi.fn(),
        pixelRatio: 1,
        width: 1440,
      }),
    ).rejects.toThrow('surface construction failed');

    const scene = manimHarness.scenes[0];
    expect(scene.clear).toHaveBeenCalledWith({ render: false });
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });
});
