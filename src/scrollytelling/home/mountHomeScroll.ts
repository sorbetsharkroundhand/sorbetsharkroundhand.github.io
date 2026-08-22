import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { ScrollProgressDriver } from '../ScrollProgressDriver';
import { clampProgress } from '../ScrollSceneController';
import { sampleHomeTimeline, type HomeTimelineState } from './homeTimeline';

export interface HomeScrollDetail {
  state: HomeTimelineState;
}

gsap.registerPlugin(ScrollTrigger);

const reducedMotionProgress = 0.43;

interface SettleZone {
  from: number;
  plateau: number;
}

// Pausing anywhere inside a zone resolves to that zone's finished
// beat, so each chapter can play out completely even when reading
// stops mid-scroll. The first zone rests untouched near the very
// top so the opening frame stays an intentional emergence.
const settleZones: readonly SettleZone[] = [
  { from: 0.05, plateau: 0.25 },
  { from: 0.36, plateau: 0.47 },
  { from: 0.595, plateau: 0.72 },
  { from: 0.83, plateau: 0.94 },
];

const SETTLE_IDLE_MS = 150;
const SETTLE_DURATION_MS = 650;

export function chapterPlateau(progress: number): number | null {
  let plateau: number | null = null;
  for (const zone of settleZones) {
    if (progress >= zone.from) plateau = zone.plateau;
  }
  return plateau;
}

function projectState(root: HTMLElement, state: HomeTimelineState): void {
  root.dataset.homeChapter = state.chapter;
  root.style.setProperty('--home-progress', String(state.progress));
  root.style.setProperty('--home-aurora-intensity', state.auroraIntensity.toFixed(3));
  root.style.setProperty('--home-topology-opacity', String(state.topologyOpacity));
  root.style.setProperty('--home-statement-opacity', String(state.statementOpacity));
  root.style.setProperty('--home-ascii-opacity', String(state.asciiOpacity));
  root.style.setProperty('--home-index-opacity', String(state.indexOpacity));
  root.dispatchEvent(
    new CustomEvent<HomeScrollDetail>('home-scrolly:progress', {
      bubbles: true,
      detail: { state },
    }),
  );
}

export function mountHomeScroll(root: HTMLElement): () => void {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scrollLabel = root.querySelector<HTMLElement>('[data-home-scroll-value]');
  const driver = new ScrollProgressDriver((progress) => {
    const state = sampleHomeTimeline(progress);
    projectState(root, state);
    if (scrollLabel) {
      const label = `SCROLL / ${Math.round(state.progress * 100).toString().padStart(3, '0')}`;
      if (scrollLabel.textContent !== label) scrollLabel.textContent = label;
    }
  });
  let disposed = false;
  let trigger: ReturnType<typeof ScrollTrigger.create> | null = null;

  let rawProgress = 0;
  let idleTimerId: ReturnType<typeof setTimeout> | null = null;
  let settleFrameId: number | null = null;
  let settleFrom = 0;
  let settleDistance = 0;
  let settleStartedAt = 0;

  const stopSettle = () => {
    if (idleTimerId !== null) {
      clearTimeout(idleTimerId);
      idleTimerId = null;
    }
    if (settleFrameId !== null) {
      cancelAnimationFrame(settleFrameId);
      settleFrameId = null;
    }
  };

  const stepSettle = (now: number) => {
    settleFrameId = null;
    if (disposed) return;
    const linear = Math.min(1, (now - settleStartedAt) / SETTLE_DURATION_MS);
    const eased = linear * linear * (3 - 2 * linear);
    driver.push(settleFrom + settleDistance * eased);
    if (linear < 1) settleFrameId = requestAnimationFrame(stepSettle);
  };

  const beginSettle = () => {
    if (disposed) return;
    const plateau = chapterPlateau(rawProgress);
    if (plateau === null) return;
    settleFrom = rawProgress;
    settleDistance = plateau - rawProgress;
    if (Math.abs(settleDistance) < 0.002) return;
    settleStartedAt = performance.now();
    settleFrameId = requestAnimationFrame(stepSettle);
  };

  const handleProgress = (progress: number) => {
    if (disposed) return;
    rawProgress = clampProgress(progress ?? 0);
    stopSettle();
    driver.push(rawProgress);
    idleTimerId = setTimeout(() => {
      idleTimerId = null;
      beginSettle();
    }, SETTLE_IDLE_MS);
  };

  const applyMotionPreference = () => {
    trigger?.kill();
    trigger = null;
    stopSettle();

    if (motionQuery.matches) {
      root.dataset.motion = 'reduced';
      delete root.dataset.enhanced;
      driver.push(reducedMotionProgress);
      return;
    }

    root.dataset.motion = 'full';
    root.dataset.enhanced = 'true';
    trigger = ScrollTrigger.create({
      end: 'bottom bottom',
      onUpdate: (self) => handleProgress(self.progress),
      start: 'top top',
      trigger: root,
    });
    handleProgress(trigger.progress);
  };

  motionQuery.addEventListener('change', applyMotionPreference);
  applyMotionPreference();

  return () => {
    if (disposed) return;
    disposed = true;
    motionQuery.removeEventListener('change', applyMotionPreference);
    trigger?.kill();
    trigger = null;
    stopSettle();
    driver.dispose();
    delete root.dataset.enhanced;
  };
}
