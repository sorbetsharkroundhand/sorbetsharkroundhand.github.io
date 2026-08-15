import { clampProgress } from './ScrollSceneController';

export interface FrameScheduler {
  request(callback: FrameRequestCallback): number;
  cancel(id: number): void;
}

const browserFrameScheduler: FrameScheduler = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (id) => cancelAnimationFrame(id),
};

export class ScrollProgressDriver {
  private frameId: number | null = null;
  private latestProgress = 0;
  private disposed = false;

  constructor(
    private readonly listener: (progress: number) => void,
    private readonly scheduler: FrameScheduler = browserFrameScheduler,
  ) {}

  push(progress: number): void {
    if (this.disposed) return;

    this.latestProgress = clampProgress(progress);
    if (this.frameId !== null) return;

    this.frameId = this.scheduler.request(() => {
      this.frameId = null;
      if (this.disposed) return;
      this.listener(this.latestProgress);
    });
  }

  dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
    if (this.frameId !== null) {
      this.scheduler.cancel(this.frameId);
      this.frameId = null;
    }
  }
}
