import { useEffect, useRef, useState } from 'react';

import {
  clampProgress,
  type ScrollSceneController,
} from '../../scrollytelling/ScrollSceneController';
import type { HomeScrollDetail } from '../../scrollytelling/home/mountHomeScroll';
import { createHomeAscii, createHomeTopology } from './homeVisualLoaders';

type VisualStatus = 'loading' | 'ready' | 'error';

interface PointerAwareController extends ScrollSceneController {
  setPointer?(x: number, y: number, active: boolean): void;
}

interface ViewportState {
  height: number;
  mobile: boolean;
  pixelRatio: number;
  width: number;
}

function measureViewport(element: HTMLElement): ViewportState {
  const bounds = element.getBoundingClientRect();
  const width = Math.max(1, bounds.width || element.clientWidth || window.innerWidth);
  const height = Math.max(1, bounds.height || element.clientHeight || window.innerHeight);
  const mobile = width < 640;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75);
  return { height, mobile, pixelRatio, width };
}

export function HomeManimScene() {
  const visualRef = useRef<HTMLDivElement>(null);
  const topologyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [topologyStatus, setTopologyStatus] = useState<VisualStatus>('loading');
  const [asciiStatus, setAsciiStatus] = useState<VisualStatus>('loading');

  useEffect(() => {
    const shell = visualRef.current?.closest<HTMLElement>('.home-scrolly__visual');
    if (!shell) return;

    shell.dataset.topologyStatus = topologyStatus;
    shell.dataset.asciiStatus = asciiStatus;

    return () => {
      if (shell.dataset.topologyStatus === topologyStatus) {
        delete shell.dataset.topologyStatus;
      }
      if (shell.dataset.asciiStatus === asciiStatus) {
        delete shell.dataset.asciiStatus;
      }
    };
  }, [asciiStatus, topologyStatus]);

  useEffect(() => {
    const visual = visualRef.current;
    const topologyContainer = topologyRef.current;
    const canvas = canvasRef.current;
    const story = visual?.closest<HTMLElement>('[data-home-scrolly]');
    if (!visual || !topologyContainer || !canvas || !story) return;

    let cancelled = false;
    let topologyController: PointerAwareController | null = null;
    let asciiController: PointerAwareController | null = null;
    let pointerFrameId: number | null = null;
    const projectedProgress = Number.parseFloat(
      story.style.getPropertyValue('--home-progress'),
    );
    let latestProgress = clampProgress(projectedProgress);
    let latestPointer = { active: false, x: 0.5, y: 0.5 };

    const applyProgress = () => {
      if (document.visibilityState === 'hidden') return;
      topologyController?.setProgress(latestProgress);
      asciiController?.setProgress(latestProgress);
    };

    const applyViewport = () => {
      const viewport = measureViewport(visual);
      topologyController?.resize(viewport.width, viewport.height, viewport.pixelRatio);
      asciiController?.resize(viewport.width, viewport.height, viewport.pixelRatio);
      return viewport;
    };

    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<HomeScrollDetail>).detail;
      if (!detail?.state) return;
      latestProgress = detail.state.progress;
      applyProgress();
    };

    const handleVisibility = () => {
      if (document.visibilityState !== 'hidden') applyProgress();
    };

    const flushPointer = () => {
      pointerFrameId = null;
      if (cancelled || document.visibilityState === 'hidden') return;
      topologyController?.setPointer?.(
        latestPointer.x,
        latestPointer.y,
        latestPointer.active,
      );
      asciiController?.setPointer?.(latestPointer.x, latestPointer.y, latestPointer.active);
      applyProgress();
    };

    const schedulePointer = (x: number, y: number, active: boolean) => {
      latestPointer = { active, x, y };
      if (pointerFrameId !== null) return;
      pointerFrameId = requestAnimationFrame(flushPointer);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const bounds = visual.getBoundingClientRect();
      schedulePointer(
        Math.min(1, Math.max(0, (event.clientX - bounds.left) / Math.max(1, bounds.width))),
        Math.min(1, Math.max(0, (event.clientY - bounds.top) / Math.max(1, bounds.height))),
        true,
      );
    };

    const handlePointerLeave = () => {
      schedulePointer(latestPointer.x, latestPointer.y, false);
    };

    const observer = new ResizeObserver(() => {
      applyViewport();
    });
    observer.observe(visual);
    story.addEventListener('home-scrolly:progress', handleProgress);
    document.addEventListener('visibilitychange', handleVisibility);
    visual.addEventListener('pointermove', handlePointerMove, { passive: true });
    visual.addEventListener('pointerleave', handlePointerLeave, { passive: true });

    const initializeTopology = async () => {
      try {
        const viewport = measureViewport(visual);
        const controller = await createHomeTopology(topologyContainer, {
          ...viewport,
          onFailure: () => {
            if (!cancelled) setTopologyStatus('error');
          },
        });
        if (cancelled) {
          controller.dispose();
          return;
        }
        topologyController = controller;
        controller.resize(viewport.width, viewport.height, viewport.pixelRatio);
        controller.setProgress(latestProgress);
        setTopologyStatus('ready');
      } catch {
        if (!cancelled) setTopologyStatus('error');
      }
    };

    const initializeAscii = async () => {
      try {
        const viewport = measureViewport(visual);
        const controller = await createHomeAscii(canvas, { mobile: viewport.mobile });
        if (cancelled) {
          controller.dispose();
          return;
        }
        asciiController = controller;
        controller.resize(viewport.width, viewport.height, viewport.pixelRatio);
        controller.setProgress(latestProgress);
        setAsciiStatus('ready');
      } catch {
        if (!cancelled) setAsciiStatus('error');
      }
    };

    void initializeTopology();
    void initializeAscii();

    return () => {
      cancelled = true;
      observer.disconnect();
      story.removeEventListener('home-scrolly:progress', handleProgress);
      document.removeEventListener('visibilitychange', handleVisibility);
      visual.removeEventListener('pointermove', handlePointerMove);
      visual.removeEventListener('pointerleave', handlePointerLeave);
      if (pointerFrameId !== null) cancelAnimationFrame(pointerFrameId);
      topologyController?.dispose();
      asciiController?.dispose();
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="home-visuals"
      data-ascii-status={asciiStatus}
      data-home-visuals=""
      data-topology-status={topologyStatus}
      ref={visualRef}
    >
      <div className="home-visuals__topology" data-home-topology="" ref={topologyRef} />
      <canvas className="home-visuals__ascii" data-home-ascii="" ref={canvasRef} />
    </div>
  );
}
