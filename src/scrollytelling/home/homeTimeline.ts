import { clampProgress } from '../ScrollSceneController';

export type HomeChapter =
  | 'emergence'
  | 'topology'
  | 'statement'
  | 'dissolution'
  | 'reconstruction';

export interface HomeTimelineState {
  progress: number;
  chapter: HomeChapter;
  auroraIntensity: number;
  topologyOpacity: number;
  statementOpacity: number;
  asciiOpacity: number;
  indexOpacity: number;
  surfaceAmplitude: number;
  surfaceFrequency: number;
  cameraPhi: number;
  cameraTheta: number;
  cameraDistance: number;
}

function segment(progress: number, start: number, end: number): number {
  return clampProgress((progress - start) / (end - start));
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}

function mix(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function selectChapter(progress: number): HomeChapter {
  if (progress < 0.14) return 'emergence';
  if (progress < 0.38) return 'topology';
  if (progress < 0.56) return 'statement';
  if (progress < 0.8) return 'dissolution';
  return 'reconstruction';
}

export function sampleHomeTimeline(input: number): HomeTimelineState {
  const progress = clampProgress(input);
  const topologyArrival = 0.08 + 0.92 * smoothstep(segment(progress, 0, 0.18));
  const topologyDeparture = 1 - smoothstep(segment(progress, 0.52, 0.78));
  const topologyOpacity = topologyArrival * topologyDeparture;
  const statementOpacity = 1 - smoothstep(segment(progress, 0.56, 0.68));
  const asciiOpacity =
    smoothstep(segment(progress, 0.52, 0.62)) *
    (1 - smoothstep(segment(progress, 0.78, 0.92)));
  const indexOpacity = smoothstep(segment(progress, 0.78, 0.92));
  const topologyGrowth = smoothstep(segment(progress, 0.02, 0.32));
  const topologyCollapse = smoothstep(segment(progress, 0.48, 0.78));
  const cameraTravel = smoothstep(segment(progress, 0.08, 0.76));

  const auroraArrival = smoothstep(segment(progress, 0.02, 0.26));
  const auroraDeparture = 1 - smoothstep(segment(progress, 0.6, 0.86));
  const auroraIntensity = 0.55 + 0.45 * auroraArrival * auroraDeparture;

  return {
    progress,
    chapter: selectChapter(progress),
    auroraIntensity,
    topologyOpacity,
    statementOpacity,
    asciiOpacity,
    indexOpacity,
    surfaceAmplitude: (0.15 + 1.4 * topologyGrowth) * (1 - 0.45 * topologyCollapse),
    surfaceFrequency: mix(0.65, 1.85, smoothstep(segment(progress, 0.14, 0.56))),
    cameraPhi: mix(Math.PI * 0.34, Math.PI * 0.48, cameraTravel),
    cameraTheta: mix(-0.82, 0.35, cameraTravel),
    cameraDistance: mix(16, 10.5, cameraTravel),
  };
}
