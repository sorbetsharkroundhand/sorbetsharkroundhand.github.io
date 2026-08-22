import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { ScrollProgressDriver } from '../ScrollProgressDriver';
import { sampleHomeTimeline, type HomeTimelineState } from './homeTimeline';

export interface HomeScrollDetail {
  state: HomeTimelineState;
}

gsap.registerPlugin(ScrollTrigger);

const reducedMotionProgress = 0.43;

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
  const driver = new ScrollProgressDriver((progress) => {
    projectState(root, sampleHomeTimeline(progress));
  });
  let disposed = false;
  let trigger: ReturnType<typeof ScrollTrigger.create> | null = null;

  const applyMotionPreference = () => {
    trigger?.kill();
    trigger = null;

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
      onUpdate: (self) => driver.push(self.progress),
      start: 'top top',
      trigger: root,
    });
    driver.push(trigger.progress);
  };

  motionQuery.addEventListener('change', applyMotionPreference);
  applyMotionPreference();

  return () => {
    if (disposed) return;
    disposed = true;
    motionQuery.removeEventListener('change', applyMotionPreference);
    trigger?.kill();
    trigger = null;
    driver.dispose();
    delete root.dataset.enhanced;
  };
}
