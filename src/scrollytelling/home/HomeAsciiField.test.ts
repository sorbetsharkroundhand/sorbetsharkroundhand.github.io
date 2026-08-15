// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ScrollSceneController } from '../ScrollSceneController';
import { ASCII_DENSITY_RAMP, HomeAsciiField } from './HomeAsciiField';

interface TextCall {
  fillStyle: string;
  text: string;
  x: number;
  y: number;
}

function createCanvasHarness(contextAvailable = true) {
  const canvas = document.createElement('canvas');
  canvas.getBoundingClientRect = () => ({
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
  const textCalls: TextCall[] = [];
  const context = {
    clearRect: vi.fn(),
    fillStyle: '',
    fillText(text: string, x: number, y: number) {
      textCalls.push({ fillStyle: this.fillStyle, text, x, y });
    },
    font: '',
    globalAlpha: 1,
    setTransform: vi.fn(),
    textAlign: 'left',
    textBaseline: 'alphabetic',
  };
  vi.spyOn(canvas, 'getContext').mockImplementation(
    () => (contextAvailable ? (context as unknown as CanvasRenderingContext2D) : null),
  );

  return { canvas, context, textCalls };
}

function singleCharacterFrame(calls: readonly TextCall[]) {
  return calls
    .filter(({ text }) => [...text].length === 1)
    .map(({ fillStyle, text, x, y }) => `${text}:${x.toFixed(2)}:${y.toFixed(2)}:${fillStyle}`);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('HomeAsciiField', () => {
  it('uses the approved density ramp', () => {
    expect(ASCII_DENSITY_RAMP).toEqual(['.', '·', '+', '/', '#', '%']);
  });

  it('draws the same frame for the same progress, viewport, and pointer', () => {
    const harness = createCanvasHarness();
    const field = new HomeAsciiField(harness.canvas, { mobile: false });
    field.resize(960, 720, 1.5);
    field.setPointer(0.42, 0.58, true);
    field.setProgress(0.68);
    const firstFrame = singleCharacterFrame(harness.textCalls);

    harness.textCalls.splice(0);
    field.setProgress(0.68);

    expect(singleCharacterFrame(harness.textCalls)).toEqual(firstFrame);
    field.dispose();
  });

  it('restores the earlier frame after progress decreases', () => {
    const harness = createCanvasHarness();
    const field = new HomeAsciiField(harness.canvas, { mobile: false });
    field.resize(800, 600, 1);
    field.setProgress(0.22);
    const earlierFrame = singleCharacterFrame(harness.textCalls);

    harness.textCalls.splice(0);
    field.setProgress(0.74);
    harness.textCalls.splice(0);
    field.setProgress(0.22);

    expect(singleCharacterFrame(harness.textCalls)).toEqual(earlierFrame);
    field.dispose();
  });

  it('caps mobile columns and pixel ratio', () => {
    const harness = createCanvasHarness();
    const controller: ScrollSceneController = new HomeAsciiField(harness.canvas, {
      mobile: true,
    });

    controller.resize(390, 844, 3);
    controller.setProgress(0.68);

    const uniqueColumns = new Set(
      harness.textCalls.filter(({ text }) => [...text].length === 1).map(({ x }) => x),
    );
    expect(uniqueColumns.size).toBeLessThanOrEqual(48);
    expect(harness.canvas.width).toBe(Math.round(390 * 1.25));
    expect(harness.canvas.height).toBe(Math.round(844 * 1.25));

    controller.dispose();
    controller.dispose();
  });

  it('caps desktop columns and pixel ratio', () => {
    const harness = createCanvasHarness();
    const field = new HomeAsciiField(harness.canvas, { mobile: false });

    field.resize(1440, 900, 3);
    field.setProgress(0.68);

    const uniqueColumns = new Set(
      harness.textCalls.filter(({ text }) => [...text].length === 1).map(({ x }) => x),
    );
    expect(uniqueColumns.size).toBeLessThanOrEqual(108);
    expect(harness.canvas.width).toBe(Math.round(1440 * 1.75));
    expect(harness.canvas.height).toBe(Math.round(900 * 1.75));

    field.dispose();
  });

  it('updates density and pixel-ratio policy after crossing the mobile breakpoint', () => {
    const harness = createCanvasHarness();
    const field = new HomeAsciiField(harness.canvas, { mobile: true });

    field.resize(1440, 900, 3);
    harness.textCalls.splice(0);
    field.setProgress(0.68);

    const uniqueColumns = new Set(
      harness.textCalls.filter(({ text }) => [...text].length === 1).map(({ x }) => x),
    );
    expect(uniqueColumns.size).toBeGreaterThan(48);
    expect(uniqueColumns.size).toBeLessThanOrEqual(108);
    expect(harness.canvas.width).toBe(Math.round(1440 * 1.75));
    field.dispose();
  });

  it('redraws its current progress after resizing', () => {
    const harness = createCanvasHarness();
    const field = new HomeAsciiField(harness.canvas, { mobile: false });
    field.resize(800, 600, 1);
    field.setProgress(0.68);
    harness.textCalls.splice(0);
    harness.context.clearRect.mockClear();

    field.resize(900, 640, 1.5);

    expect(harness.context.clearRect).toHaveBeenCalledTimes(1);
    expect(harness.textCalls.length).toBeGreaterThan(0);
    expect(harness.context.setTransform).toHaveBeenLastCalledWith(1.5, 0, 0, 1.5, 0, 0);
    field.dispose();
  });

  it('stores pointer input without drawing until the next progress sample', () => {
    const harness = createCanvasHarness();
    const field = new HomeAsciiField(harness.canvas, { mobile: false });
    field.resize(800, 600, 1);
    field.setProgress(0.68);
    harness.textCalls.splice(0);

    field.setPointer(0.2, 0.8, true);

    expect(harness.textCalls).toHaveLength(0);
    field.setProgress(0.68);
    expect(harness.textCalls.length).toBeGreaterThan(0);
    field.dispose();
  });

  it('removes owned pointer listeners and ignores work after idempotent disposal', () => {
    const harness = createCanvasHarness();
    const add = vi.spyOn(harness.canvas, 'addEventListener');
    const remove = vi.spyOn(harness.canvas, 'removeEventListener');
    const field = new HomeAsciiField(harness.canvas, { mobile: true });
    field.resize(390, 844, 1);
    harness.textCalls.splice(0);

    field.dispose();
    field.dispose();
    field.setProgress(0.68);

    expect(add).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(add).toHaveBeenCalledWith('pointerleave', expect.any(Function));
    expect(remove).toHaveBeenCalledTimes(2);
    expect(harness.textCalls).toHaveLength(0);
  });

  it('fails construction when the decorative canvas has no 2D context', () => {
    const harness = createCanvasHarness(false);

    expect(() => new HomeAsciiField(harness.canvas, { mobile: false })).toThrow(
      '2D canvas context unavailable',
    );
  });
});
