// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mountVisualizations, type ObserverFactory } from './mount-visualizations';

function createSlot(id = 'lesson:demo') {
  document.body.innerHTML = `
    <section class="visualization-slot" data-visualization-id="${id}" data-accent="cyan">
      <pre class="visualization-slot__ascii">loading</pre>
      <p class="visualization-slot__status" role="status">waiting</p>
      <div class="visualization-slot__mount"></div>
      <div class="visualization-slot__error" hidden>
        <p role="alert">failed</p>
        <button class="visualization-slot__retry" type="button">retry</button>
      </div>
    </section>`;
  return document.querySelector<HTMLElement>('.visualization-slot')!;
}

function createObserverHarness() {
  let callback: IntersectionObserverCallback | undefined;
  const observer = {
    disconnect: vi.fn(),
    observe: vi.fn(),
    takeRecords: vi.fn(() => []),
    unobserve: vi.fn(),
    root: null,
    rootMargin: '0px',
    scrollMargin: '0px',
    thresholds: [0],
  } satisfies IntersectionObserver;
  const createObserver: ObserverFactory = (nextCallback) => {
    callback = nextCallback;
    return observer;
  };

  return {
    createObserver,
    observer,
    trigger(target: Element) {
      callback?.(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        observer,
      );
    },
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('mountVisualizations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('loads near the viewport, mounts once, and unmounts during cleanup', async () => {
    const slot = createSlot();
    const observerHarness = createObserverHarness();
    const loader = vi.fn().mockResolvedValue({ default: () => null });
    const render = vi.fn();
    const unmount = vi.fn();
    const createRoot = vi.fn(() => ({ render, unmount }));

    const cleanup = mountVisualizations({
      createObserver: observerHarness.createObserver,
      loaders: { 'lesson:demo': loader },
      loadRuntime: async () => ({ createElement: vi.fn(() => 'scene'), createRoot }),
    });

    expect(slot.dataset.state).toBe('waiting');
    expect(loader).not.toHaveBeenCalled();

    observerHarness.trigger(slot);
    await flushPromises();

    expect(slot.dataset.state).toBe('ready');
    expect(render).toHaveBeenCalledWith('scene');
    expect(slot.querySelector('.visualization-slot__ascii')).toHaveProperty('hidden', true);

    observerHarness.trigger(slot);
    await flushPromises();
    expect(createRoot).toHaveBeenCalledTimes(1);

    cleanup();
    expect(observerHarness.observer.disconnect).toHaveBeenCalledTimes(1);
    expect(unmount).toHaveBeenCalledTimes(1);
  });

  it('shows an accessible failure and retries without duplicating the root', async () => {
    const slot = createSlot();
    const observerHarness = createObserverHarness();
    const loader = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ default: () => null });
    const render = vi.fn();
    const createRoot = vi.fn(() => ({ render, unmount: vi.fn() }));

    mountVisualizations({
      createObserver: observerHarness.createObserver,
      loaders: { 'lesson:demo': loader },
      loadRuntime: async () => ({ createElement: vi.fn(() => 'scene'), createRoot }),
    });

    observerHarness.trigger(slot);
    await flushPromises();

    expect(slot.dataset.state).toBe('error');
    expect(slot.querySelector('.visualization-slot__error')).toHaveProperty('hidden', false);
    expect(slot.querySelector('[role="alert"]')).toBeTruthy();

    slot.querySelector<HTMLButtonElement>('.visualization-slot__retry')!.click();
    await flushPromises();

    expect(slot.dataset.state).toBe('ready');
    expect(slot.querySelector('.visualization-slot__error')).toHaveProperty('hidden', true);
    expect(createRoot).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });
});
