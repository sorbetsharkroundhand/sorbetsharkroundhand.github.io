import { describe, expect, it, vi } from 'vitest';

import { ScrollProgressDriver, type FrameScheduler } from './ScrollProgressDriver';

function createScheduler() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  const scheduler: FrameScheduler = {
    request(callback) {
      const id = nextId;
      nextId += 1;
      callbacks.set(id, callback);
      return id;
    },
    cancel(id) {
      callbacks.delete(id);
    },
  };

  return {
    callbacks,
    flush(time = 0) {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(time));
    },
    scheduler,
  };
}

describe('ScrollProgressDriver', () => {
  it('publishes only the newest progress once per animation frame', () => {
    const frame = createScheduler();
    const listener = vi.fn();
    const driver = new ScrollProgressDriver(listener, frame.scheduler);

    driver.push(0.1);
    driver.push(0.35);
    driver.push(0.2);

    expect(frame.callbacks.size).toBe(1);
    frame.flush();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(0.2);
  });

  it('clamps invalid and out-of-range progress before delivery', () => {
    const frame = createScheduler();
    const delivered: number[] = [];
    const driver = new ScrollProgressDriver((progress) => delivered.push(progress), frame.scheduler);

    driver.push(-3);
    frame.flush();
    driver.push(4);
    frame.flush();
    driver.push(Number.NaN);
    frame.flush();

    expect(delivered).toEqual([0, 1, 0]);
  });

  it('delivers decreasing progress on a later frame', () => {
    const frame = createScheduler();
    const delivered: number[] = [];
    const driver = new ScrollProgressDriver((progress) => delivered.push(progress), frame.scheduler);

    driver.push(0.9);
    frame.flush();
    driver.push(0.15);
    frame.flush();

    expect(delivered).toEqual([0.9, 0.15]);
  });

  it('cancels pending work and ignores updates after idempotent disposal', () => {
    const frame = createScheduler();
    const listener = vi.fn();
    const cancel = vi.spyOn(frame.scheduler, 'cancel');
    const driver = new ScrollProgressDriver(listener, frame.scheduler);

    driver.push(0.6);
    driver.dispose();
    driver.dispose();
    driver.push(0.8);
    frame.flush();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
    expect(frame.callbacks.size).toBe(0);
  });
});
