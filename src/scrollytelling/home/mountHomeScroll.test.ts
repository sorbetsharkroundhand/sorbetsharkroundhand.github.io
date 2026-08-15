// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const gsapHarness = vi.hoisted(() => ({
  create: vi.fn(),
  registerPlugin: vi.fn(),
}));

vi.mock('gsap', () => ({
  gsap: { registerPlugin: gsapHarness.registerPlugin },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: gsapHarness.create },
}));

import { mountHomeScroll, type HomeScrollDetail } from './mountHomeScroll';

function installAnimationFrames() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    const id = nextId;
    nextId += 1;
    callbacks.set(id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));

  return {
    callbacks,
    flush() {
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(0));
    },
  };
}

function installMotionPreference(matches: boolean) {
  const target = new EventTarget();
  const addEventListener = vi.spyOn(target, 'addEventListener');
  const removeEventListener = vi.spyOn(target, 'removeEventListener');
  const mediaQuery = Object.assign(target, {
    addEventListener,
    addListener: vi.fn(),
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    removeEventListener,
    removeListener: vi.fn(),
  }) as unknown as MediaQueryList;

  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery));
  return { mediaQuery };
}

function createRoot() {
  const root = document.createElement('section');
  root.dataset.homeScrolly = '';
  document.body.append(root);
  return root;
}

beforeEach(() => {
  document.body.replaceChildren();
  gsapHarness.create.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('mountHomeScroll', () => {
  it('registers ScrollTrigger once for the module', () => {
    expect(gsapHarness.registerPlugin).toHaveBeenCalledTimes(1);
  });

  it('projects the newest forward and reverse progress without pinning in JavaScript', () => {
    const frames = installAnimationFrames();
    installMotionPreference(false);
    const kill = vi.fn();
    let configuration:
      | {
          end: string;
          onUpdate: (self: { progress: number }) => void;
          start: string;
          trigger: HTMLElement;
        }
      | undefined;
    gsapHarness.create.mockImplementation((options) => {
      configuration = options;
      return { kill };
    });
    const root = createRoot();
    const events: HomeScrollDetail[] = [];
    root.addEventListener('home-scrolly:progress', (event) => {
      events.push((event as CustomEvent<HomeScrollDetail>).detail);
    });

    const dispose = mountHomeScroll(root);

    expect(configuration).toMatchObject({
      end: 'bottom bottom',
      start: 'top top',
      trigger: root,
    });
    expect(configuration).not.toHaveProperty('pin');
    expect(root.dataset.enhanced).toBe('true');

    configuration?.onUpdate({ progress: 0.68 });
    frames.flush();

    expect(root.dataset.homeChapter).toBe('dissolution');
    expect(root.style.getPropertyValue('--home-progress')).toBe('0.68');
    expect(root.style.getPropertyValue('--home-ascii-opacity')).toBe('1');
    expect(events.at(-1)?.state.chapter).toBe('dissolution');

    configuration?.onUpdate({ progress: 0.1 });
    frames.flush();

    expect(root.dataset.homeChapter).toBe('emergence');
    expect(events.at(-1)?.state.progress).toBe(0.1);

    dispose();
    expect(kill).toHaveBeenCalledTimes(1);
  });

  it('starts from ScrollTrigger current progress after scroll restoration', () => {
    const frames = installAnimationFrames();
    installMotionPreference(false);
    gsapHarness.create.mockReturnValue({ kill: vi.fn(), progress: 0.47 });
    const root = createRoot();

    const dispose = mountHomeScroll(root);
    frames.flush();

    expect(root.dataset.homeChapter).toBe('statement');
    expect(root.style.getPropertyValue('--home-progress')).toBe('0.47');
    dispose();
  });

  it('uses a stable non-pinned frame for reduced motion and cleans its listener once', () => {
    const frames = installAnimationFrames();
    const motion = installMotionPreference(true);
    const root = createRoot();
    const listener = vi.fn();
    root.addEventListener('home-scrolly:progress', listener);

    const dispose = mountHomeScroll(root);
    frames.flush();

    expect(gsapHarness.create).not.toHaveBeenCalled();
    expect(root.dataset.motion).toBe('reduced');
    expect(root.dataset.enhanced).toBeUndefined();
    expect(root.dataset.homeChapter).toBe('statement');
    expect(listener).toHaveBeenCalledTimes(1);

    dispose();
    dispose();

    expect(motion.mediaQuery.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    expect(motion.mediaQuery.removeEventListener).toHaveBeenCalledTimes(1);
    expect(frames.callbacks.size).toBe(0);
  });
});
