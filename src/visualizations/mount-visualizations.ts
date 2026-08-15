import type { ReactNode } from 'react';

import {
  visualizationLoaders,
  type VisualizationLoader,
  type VisualizationProps,
} from './client-registry';
import type { AccentName } from './manifest';

interface RootLike {
  render(node: ReactNode): void;
  unmount(): void;
}

interface Runtime {
  createElement(
    component: (props: VisualizationProps) => ReactNode,
    props: VisualizationProps,
  ): ReactNode;
  createRoot(container: Element): RootLike;
}

export type ObserverFactory = (
  callback: IntersectionObserverCallback,
  options: IntersectionObserverInit,
) => IntersectionObserver;

interface MountOptions {
  root?: ParentNode;
  loaders?: Record<string, VisualizationLoader>;
  createObserver?: ObserverFactory;
  loadRuntime?: () => Promise<Runtime>;
}

interface SlotState {
  root?: RootLike;
  loading: boolean;
  retryButton?: HTMLButtonElement;
  retryHandler?: () => void;
}

const defaultObserverFactory: ObserverFactory = (callback, options) =>
  new IntersectionObserver(callback, options);

async function defaultRuntimeLoader(): Promise<Runtime> {
  const [react, reactDom] = await Promise.all([import('react'), import('react-dom/client')]);
  return { createElement: react.createElement, createRoot: reactDom.createRoot };
}

function setSlotState(slot: HTMLElement, state: 'waiting' | 'loading' | 'ready' | 'error') {
  slot.dataset.state = state;
  const error = slot.querySelector<HTMLElement>('.visualization-slot__error');
  const ascii = slot.querySelector<HTMLElement>('.visualization-slot__ascii');
  const status = slot.querySelector<HTMLElement>('.visualization-slot__status');

  if (error) error.hidden = state !== 'error';
  if (ascii) ascii.hidden = state === 'ready';
  if (status) {
    status.textContent = {
      waiting: '화면에 가까워지면 시각화를 불러옵니다.',
      loading: '시각화를 불러오는 중입니다.',
      ready: '시각화를 사용할 수 있습니다.',
      error: '시각화를 불러오지 못했습니다.',
    }[state];
  }
}

export function mountVisualizations({
  root = document,
  loaders = visualizationLoaders,
  createObserver = defaultObserverFactory,
  loadRuntime = defaultRuntimeLoader,
}: MountOptions = {}): () => void {
  const slots = [...root.querySelectorAll<HTMLElement>('.visualization-slot[data-visualization-id]')];
  const states = new Map<HTMLElement, SlotState>();
  let disposed = false;

  const start = async (slot: HTMLElement) => {
    const state = states.get(slot);
    const id = slot.dataset.visualizationId;
    const accent = slot.dataset.accent as AccentName | undefined;
    if (!state || state.loading || state.root || !id || !accent) return;

    state.loading = true;
    setSlotState(slot, 'loading');

    try {
      const loader = loaders[id];
      if (!loader) throw new Error(`No visualization loader registered for "${id}".`);

      const [module, runtime] = await Promise.all([loader(), loadRuntime()]);
      if (disposed) return;

      const container = slot.querySelector<HTMLElement>('.visualization-slot__mount');
      if (!container) throw new Error(`Visualization slot "${id}" has no mount element.`);

      const reactRoot = runtime.createRoot(container);
      reactRoot.render(
        runtime.createElement(module.default as (props: VisualizationProps) => ReactNode, { accent }),
      );
      state.root = reactRoot;
      setSlotState(slot, 'ready');
    } catch {
      if (!disposed) setSlotState(slot, 'error');
    } finally {
      state.loading = false;
    }
  };

  const observer = createObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) continue;
        observer.unobserve(entry.target);
        void start(entry.target);
      }
    },
    { rootMargin: '320px 0px', threshold: 0 },
  );

  for (const slot of slots) {
    const retryButton = slot.querySelector<HTMLButtonElement>('.visualization-slot__retry') ?? undefined;
    const retryHandler = () => void start(slot);
    states.set(slot, { loading: false, retryButton, retryHandler });
    retryButton?.addEventListener('click', retryHandler);
    setSlotState(slot, 'waiting');
    observer.observe(slot);
  }

  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    for (const state of states.values()) {
      if (state.retryButton && state.retryHandler) {
        state.retryButton.removeEventListener('click', state.retryHandler);
      }
      state.root?.unmount();
    }
    states.clear();
  };
}
