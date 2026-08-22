import { clampProgress, type ScrollSceneController } from '../ScrollSceneController';
import { sampleHomeTimeline } from './homeTimeline';

export const ASCII_DENSITY_RAMP = ['.', '·', '+', '/', '#', '%'] as const;

export interface HomeAsciiFieldOptions {
  mobile: boolean;
}

interface PointerState {
  active: boolean;
  x: number;
  y: number;
}

const observations = [
  { end: 0.635, label: 'STATISTICS', start: 0.575, x: 0.12, y: 0.24 },
  { end: 0.69, label: 'MACHINE LEARNING', start: 0.625, x: 0.55, y: 0.37 },
  { end: 0.745, label: 'AI', start: 0.68, x: 0.31, y: 0.64 },
  { end: 0.8, label: 'MATHEMATICS', start: 0.735, x: 0.66, y: 0.76 },
] as const;

export class HomeAsciiField implements ScrollSceneController {
  private readonly context: CanvasRenderingContext2D;
  private mobile: boolean;
  private disposed = false;
  private height = 1;
  private pointer: PointerState = { active: false, x: 0.5, y: 0.5 };
  private progress = 0;
  private width = 1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: HomeAsciiFieldOptions,
  ) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('2D canvas context unavailable');

    this.context = context;
    this.mobile = options.mobile;
  }

  setProgress(progress: number): void {
    if (this.disposed) return;
    this.progress = clampProgress(progress);
    this.draw();
  }

  setPointer(x: number, y: number, active: boolean): void {
    if (this.disposed) return;
    this.pointer = {
      active,
      x: clampProgress(x),
      y: clampProgress(y),
    };
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (this.disposed) return;

    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.mobile = this.width < 640;
    const cappedPixelRatio = Math.min(Math.max(pixelRatio, 1), this.mobile ? 1.25 : 1.75);
    this.canvas.width = Math.round(this.width * cappedPixelRatio);
    this.canvas.height = Math.round(this.height * cappedPixelRatio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.context.setTransform(cappedPixelRatio, 0, 0, cappedPixelRatio, 0, 0);
    this.draw();
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
  }

  private draw(): void {
    const state = sampleHomeTimeline(this.progress);
    this.context.clearRect(0, 0, this.width, this.height);
    if (state.asciiOpacity <= 0) return;

    const columnCap = this.mobile ? 48 : 72;
    const columns = Math.min(columnCap, Math.max(16, Math.floor(this.width / 10)));
    const cellWidth = this.width / columns;
    const rows = Math.max(10, Math.ceil(this.height / (cellWidth * 1.55)));
    const cellHeight = this.height / rows;

    this.context.font = `${Math.max(8, cellWidth * 0.9)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const normalizedX = (column + 0.5) / columns;
        const normalizedY = (row + 0.5) / rows;
        const wave =
          Math.sin(column * 0.17 + this.progress * 7.2) +
          Math.cos(row * 0.23 - this.progress * 5.4) +
          Math.sin((column + row) * 0.09 + this.progress * 3.1);
        const hash = ((column * 73_856_093) ^ (row * 19_349_663)) >>> 0;
        const hashNoise = (hash % 1009) / 1008;
        const pointerDistance = Math.hypot(
          normalizedX - this.pointer.x,
          normalizedY - this.pointer.y,
        );
        const pointerBias = this.pointer.active
          ? Math.max(0, 1 - pointerDistance * 5.5) * 0.24
          : 0;
        const density = clampProgress((wave + 3) / 6 * 0.74 + hashNoise * 0.26 + pointerBias);
        const characterIndex = Math.min(
          ASCII_DENSITY_RAMP.length - 1,
          Math.floor(density * ASCII_DENSITY_RAMP.length),
        );
        const trackingCell = this.pointer.active && pointerDistance < 0.025;

        this.context.globalAlpha = state.asciiOpacity * (0.18 + density * 0.7);
        this.context.fillStyle = trackingCell ? '#5b7cfa' : '#efede6';
        this.context.fillText(
          ASCII_DENSITY_RAMP[characterIndex],
          (column + 0.5) * cellWidth,
          (row + 0.5) * cellHeight,
        );
      }
    }

    for (const observation of observations) {
      if (this.progress < observation.start || this.progress > observation.end) continue;
      const middle = (observation.start + observation.end) / 2;
      const radius = (observation.end - observation.start) / 2;
      const strength = 1 - Math.abs(this.progress - middle) / radius;
      this.context.globalAlpha = state.asciiOpacity * strength * 0.72;
      this.context.fillStyle = '#777777';
      this.context.fillText(observation.label, this.width * observation.x, this.height * observation.y);
    }

    this.context.globalAlpha = 1;
  }
}
