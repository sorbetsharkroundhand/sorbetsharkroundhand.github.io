export interface ScrollSceneController {
  setProgress(progress: number): void;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

export function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
}
