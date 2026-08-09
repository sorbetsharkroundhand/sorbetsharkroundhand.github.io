import {
  Axes,
  Dot,
  FunctionGraph,
  Group,
  Line,
  type Mobject,
  Scene,
} from 'manim-web';
import { describe, expect, it, vi } from 'vitest';

import { INITIAL_PARAMETERS, STUDY_DATA } from './regressionData';
import {
  LinearRegressionSceneController,
  type RegressionFrame,
} from './LinearRegressionSceneController';

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
    renderSpy.mockRestore();
    scene.dispose();
    vi.unstubAllGlobals();
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
