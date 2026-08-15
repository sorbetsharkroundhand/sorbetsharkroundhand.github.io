import { Dot3D, Surface3D, ThreeDAxes, ThreeDScene } from 'manim-web';

import { clampProgress, type ScrollSceneController } from '../ScrollSceneController';
import { sampleHomeTimeline, type HomeTimelineState } from './homeTimeline';

export interface HomeTopologyControllerOptions {
  height: number;
  mobile: boolean;
  onFailure: () => void;
  pixelRatio: number;
  width: number;
}

interface PointerState {
  active: boolean;
  x: number;
  y: number;
}

function capPixelRatio(pixelRatio: number, mobile: boolean): number {
  return Math.min(Math.max(pixelRatio, 1), mobile ? 1.25 : 1.75);
}

function createSurfaceFunction(
  state: HomeTimelineState,
  pointer: PointerState,
): (u: number, v: number) => [number, number, number] {
  const phase = state.progress * Math.PI * 2.4;
  const pointerX = (pointer.x - 0.5) * 9;
  const pointerY = (pointer.y - 0.5) * 9;

  return (u, v) => {
    const primary =
      Math.sin(u * state.surfaceFrequency + phase) *
      Math.cos(v * state.surfaceFrequency * 0.78 - phase * 0.63) *
      0.58;
    const interference = Math.sin((u + v) * 0.72 - phase * 0.35) * 0.24;
    const pointerDistance = (u - pointerX) ** 2 + (v - pointerY) ** 2;
    const localPeak = pointer.active ? Math.exp(-pointerDistance * 0.72) * 0.42 : 0;
    const height = state.surfaceAmplitude * (primary + interference + localPeak);
    return [u, height, v];
  };
}

export class HomeTopologyController implements ScrollSceneController {
  private disposed = false;
  private failureReported = false;
  private lastProgress: number | null = null;
  private onFailure: (() => void) | null;
  private pointer: PointerState = { active: false, x: 0.5, y: 0.5 };
  private pointerDirty = false;

  private constructor(
    private readonly scene: ThreeDScene,
    private readonly surface: Surface3D,
    private mobile: boolean,
    private readonly canvas: HTMLCanvasElement,
    onFailure: () => void,
  ) {
    this.onFailure = onFailure;
    canvas.addEventListener('webglcontextlost', this.handleContextLoss, true);
  }

  static async create(
    container: HTMLElement,
    options: HomeTopologyControllerOptions,
  ): Promise<HomeTopologyController> {
    const pixelRatio = capPixelRatio(options.pixelRatio, options.mobile);
    const scene = new ThreeDScene(container, {
      autoResize: false,
      backgroundColor: '#0a0a0a',
      backgroundOpacity: 0,
      enableOrbitControls: false,
      height: options.height,
      width: options.width,
    });
    try {
      scene.renderer.getThreeRenderer().setPixelRatio(pixelRatio);
      const initialState = sampleHomeTimeline(0);
      const initialPointer: PointerState = { active: false, x: 0.5, y: 0.5 };
      const resolution = options.mobile ? 12 : 18;
      const surface = new Surface3D({
        color: '#efede6',
        func: createSurfaceFunction(initialState, initialPointer),
        opacity: 0.72,
        uRange: [-4.5, 4.5],
        uResolution: resolution,
        vRange: [-4.5, 4.5],
        vResolution: resolution,
        wireframe: true,
      });
      const axes = new ThreeDAxes({
        axisColor: '#777777',
        showLabels: false,
        showTicks: false,
        xRange: [-5, 5, 1],
        yRange: [-3, 3, 1],
        zRange: [-5, 5, 1],
      });
      const points = [
        [-3.8, 0.15, -2.4],
        [-2.1, -0.1, 2.9],
        [-0.4, 0.2, -3.7],
        [1.2, -0.15, 3.4],
        [2.8, 0.1, -1.8],
        [3.9, -0.12, 1.1],
      ].map(
        (point) =>
          new Dot3D({
            color: '#5b7cfa',
            point: point as [number, number, number],
            radius: options.mobile ? 0.035 : 0.045,
          }),
      );

      scene.add(axes, surface, ...points);
      return new HomeTopologyController(
        scene,
        surface,
        options.mobile,
        scene.getCanvas(),
        options.onFailure,
      );
    } catch (error) {
      scene.clear({ render: false });
      scene.dispose();
      throw error;
    }
  }

  setProgress(progress: number): void {
    if (this.disposed) return;

    const normalizedProgress = clampProgress(progress);
    const state = sampleHomeTimeline(normalizedProgress);
    const progressChanged = this.lastProgress !== normalizedProgress;
    this.lastProgress = normalizedProgress;

    if (state.topologyOpacity <= 0) {
      this.pointerDirty = false;
      return;
    }
    if (!progressChanged && !this.pointerDirty) return;

    this.surface.setFunc(createSurfaceFunction(state, this.pointer));
    this.scene.camera3D.orbit(state.cameraPhi, state.cameraTheta, state.cameraDistance);
    this.scene.render();
    this.pointerDirty = false;
  }

  setPointer(x: number, y: number, active: boolean): void {
    if (this.disposed) return;

    const nextPointer = {
      active,
      x: clampProgress(x),
      y: clampProgress(y),
    };
    this.pointerDirty =
      this.pointer.active !== nextPointer.active ||
      this.pointer.x !== nextPointer.x ||
      this.pointer.y !== nextPointer.y;
    this.pointer = nextPointer;
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (this.disposed) return;

    const nextWidth = Math.max(1, width);
    const nextHeight = Math.max(1, height);
    const nextMobile = nextWidth < 640;
    if (nextMobile !== this.mobile) {
      const resolution = nextMobile ? 12 : 18;
      this.surface.setUResolution(resolution);
      this.surface.setVResolution(resolution);
      this.mobile = nextMobile;
    }

    this.scene.resize(nextWidth, nextHeight);
    this.scene.renderer
      .getThreeRenderer()
      .setPixelRatio(capPixelRatio(pixelRatio, this.mobile));
    this.scene.render();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLoss, true);
    this.onFailure = null;
    this.scene.clear({ render: false });
    this.scene.dispose();
  }

  private readonly handleContextLoss = (event: Event) => {
    event.preventDefault();
    if (this.failureReported || this.disposed) return;
    this.failureReported = true;
    this.onFailure?.();
  };
}
