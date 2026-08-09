import {
  Axes,
  Dot,
  FunctionGraph,
  Group,
  Line,
  MathTex,
  type Scene,
  smooth,
  type UpdaterFunction,
  ValueTracker,
} from 'manim-web';

import type { DataPoint, RegressionParameters } from './regressionData';
import { calculateMSE } from './regressionMath';

const AXIS_COLOR = '#77766F';
const DOT_COLOR = '#28323C';
const GRAPH_COLOR = '#2457D6';
const RESIDUAL_COLOR = '#E46F61';

export interface RegressionFrame {
  slope: number;
  intercept: number;
  mse: number;
}

export interface LinearRegressionSceneControllerOptions {
  points: readonly DataPoint[];
  initial: RegressionParameters;
  onFrame: (frame: RegressionFrame) => void;
}

export class LinearRegressionSceneController {
  private scene: Scene | null;
  private onFrame: ((frame: RegressionFrame) => void) | null;
  private readonly points: readonly DataPoint[];
  private readonly axes: Axes;
  private readonly graph: FunctionGraph;
  private readonly residuals: readonly Line[];
  private readonly slopeTracker: ValueTracker;
  private readonly interceptTracker: ValueTracker;
  private readonly dynamicGroup: Group;
  private readonly dynamicUpdater: UpdaterFunction;
  private pendingFrameId: number | null = null;
  private isAnimating = false;
  private isDisposed = false;

  private constructor(
    scene: Scene,
    options: LinearRegressionSceneControllerOptions,
    axes: Axes,
    graph: FunctionGraph,
    residuals: readonly Line[],
    dynamicGroup: Group,
    slopeTracker: ValueTracker,
    interceptTracker: ValueTracker,
  ) {
    this.scene = scene;
    this.onFrame = options.onFrame;
    this.points = options.points;
    this.axes = axes;
    this.graph = graph;
    this.residuals = residuals;
    this.dynamicGroup = dynamicGroup;
    this.slopeTracker = slopeTracker;
    this.interceptTracker = interceptTracker;
    this.dynamicUpdater = () => {
      if (this.isDisposed || !this.isAnimating) return;

      this.refreshFromTrackers(false);
      this.scheduleFrameNotification();
    };
  }

  static async create(
    scene: Scene,
    options: LinearRegressionSceneControllerOptions,
  ): Promise<LinearRegressionSceneController> {
    const axes = new Axes({
      xRange: [0, 9, 1],
      yRange: [45, 95, 10],
      xLength: 10.2,
      yLength: 5.8,
      tips: false,
      color: AXIS_COLOR,
      axisConfig: {
        includeNumbers: true,
        numberFontSize: 22,
        strokeWidth: 2,
        tickSize: 0.12,
      },
    });
    const pointGroup = new Group(
      ...options.points.map(
        ({ x, y }) =>
          new Dot({
            point: axes.coordsToPoint(x, y),
            radius: 0.095,
            color: DOT_COLOR,
          }),
      ),
    );
    const slopeTracker = new ValueTracker(options.initial.slope);
    const interceptTracker = new ValueTracker(options.initial.intercept);
    const graph = new FunctionGraph({
      axes,
      xRange: [0, 9],
      func: (x) => options.initial.slope * x + options.initial.intercept,
      color: GRAPH_COLOR,
      strokeWidth: 4,
    });
    const residuals = options.points.map(({ x, y }) => {
      const observed = axes.coordsToPoint(x, y);
      return new Line({
        start: observed,
        end: observed,
        color: RESIDUAL_COLOR,
        strokeWidth: 3,
      }).setStrokeOpacity(0.62);
    });
    const dynamicGroup = new Group(graph, ...residuals);
    const controller = new LinearRegressionSceneController(
      scene,
      options,
      axes,
      graph,
      residuals,
      dynamicGroup,
      slopeTracker,
      interceptTracker,
    );

    dynamicGroup.addUpdater(controller.dynamicUpdater);
    scene.add(axes, pointGroup, dynamicGroup);

    if (!scene.isHeadless) {
      const modelLabel = new MathTex({
        latex: '\\hat{y}=wx+b',
        color: GRAPH_COLOR,
        fontSize: 30,
      });
      await modelLabel.waitForRender();
      modelLabel.moveTo(axes.coordsToPoint(7.35, 91));
      scene.add(modelLabel);
    }

    controller.refreshFromTrackers();
    return controller;
  }

  setParameters(parameters: RegressionParameters): void {
    if (this.isDisposed) return;

    this.slopeTracker.setValue(parameters.slope);
    this.interceptTracker.setValue(parameters.intercept);
    this.refreshFromTrackers();
  }

  async animateTo(parameters: RegressionParameters, duration: number): Promise<void> {
    const scene = this.scene;
    if (this.isDisposed || !scene) return;

    this.isAnimating = true;
    let completed = false;

    try {
      await scene.play(
        this.slopeTracker.animateTo(parameters.slope, { duration, rateFunc: smooth }),
        this.interceptTracker.animateTo(parameters.intercept, {
          duration,
          rateFunc: smooth,
        }),
      );
      completed = true;
    } finally {
      this.isAnimating = false;
      this.cancelPendingFrame();

      if (completed && !this.isDisposed) {
        this.refreshFromTrackers();
      }
    }
  }

  dispose(): void {
    if (this.isDisposed) return;

    this.isDisposed = true;
    this.isAnimating = false;
    this.cancelPendingFrame();
    this.dynamicGroup.removeUpdater(this.dynamicUpdater);
    this.onFrame = null;
    this.scene?.clear({ render: false });
    this.scene = null;
  }

  private refreshFromTrackers(notify = true): void {
    const scene = this.scene;
    if (this.isDisposed || !scene) return;

    const slope = this.slopeTracker.getValue();
    const intercept = this.interceptTracker.getValue();

    this.graph.setFunction((x) => slope * x + intercept);
    this.residuals.forEach((line, index) => {
      const point = this.points[index];
      line
        .setStart(this.axes.coordsToPoint(point.x, point.y))
        .setEnd(this.axes.coordsToPoint(point.x, slope * point.x + intercept));
    });

    if (!scene.isRenderLoopActive) {
      scene.render();
    }

    if (notify) {
      this.emitFrame(slope, intercept);
    }
  }

  private scheduleFrameNotification(): void {
    if (this.pendingFrameId !== null || typeof requestAnimationFrame === 'undefined') {
      return;
    }

    this.pendingFrameId = requestAnimationFrame(() => {
      this.pendingFrameId = null;
      if (this.isDisposed || !this.isAnimating) return;

      this.emitFrame(this.slopeTracker.getValue(), this.interceptTracker.getValue());
    });
  }

  private cancelPendingFrame(): void {
    if (this.pendingFrameId === null) return;

    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.pendingFrameId);
    }
    this.pendingFrameId = null;
  }

  private emitFrame(slope: number, intercept: number): void {
    this.onFrame?.({
      slope,
      intercept,
      mse: calculateMSE(this.points, slope, intercept),
    });
  }
}
