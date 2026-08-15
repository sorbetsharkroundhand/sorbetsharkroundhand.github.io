# Artwork-First Home Scrollytelling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace only the homepage with a reversible, artwork-first scrollytelling sequence that moves from a `manim-web` topology surface through an ASCII dissolution into a static, accessible latest-post index.

**Architecture:** Astro owns all meaningful HTML and links. A home-only GSAP `ScrollTrigger` converts document position into a normalized progress value, a requestAnimationFrame driver publishes that value once per frame, and independent `manim-web`, ASCII canvas, and DOM/CSS consumers sample the same pure timeline. The sticky effect is CSS-owned, so no-JavaScript and reduced-motion modes remain normal document flow. Home visual modules are loaded only by the home route.

**Tech Stack:** Astro 7, React 19, TypeScript 6, `manim-web` 0.3.24, GSAP 3.15.0 with ScrollTrigger, Vitest 4, Testing Library, Playwright 1.62.

## Global Constraints

- Preserve Markdown-only post authoring and the existing visualization manifest; do not place React, Astro, or Manim code in post Markdown.
- Do not redesign `/posts/`, `/topics/*`, or individual post pages.
- Keep the existing `site-hero` ASCII registry asset, but do not render it on the new home.
- Do not add a direct `three` dependency; use the renderer included by `manim-web`.
- Do not call asynchronous `scene.play()` from the scroll-scrub path. Every visual state must be derived directly from normalized progress.
- Render the home title, description, latest posts, and archive link as build-time Astro HTML before enhancement.
- Cap latest home posts at three and never render placeholder rows.
- Use home-local colors `#0a0a0a`, `#efede6`, `#777777`, and `#5b7cfa`; preserve the global learning-scene accent palette.
- Keep the document’s skip link first in keyboard order, use real anchors for navigation, and mark WebGL/canvas decoration `aria-hidden="true"`.
- Do not close GitHub issue #5; this work covers only its homepage portion.
- Run Astro check and Astro build serially because they share generated artifacts.

---

## File Map and Responsibilities

### Create

- `src/scrollytelling/ScrollSceneController.ts` — reusable progress/resize/dispose contract and numeric clamp helper.
- `src/scrollytelling/ScrollProgressDriver.ts` — requestAnimationFrame batching with injectable scheduling for tests.
- `src/scrollytelling/ScrollProgressDriver.test.ts` — clamping, coalescing, reverse updates, and disposal tests.
- `src/scrollytelling/home/homeTimeline.ts` — pure chapter boundaries and progress-to-state sampling.
- `src/scrollytelling/home/homeTimeline.test.ts` — boundary, interpolation, determinism, and reverse sampling tests.
- `src/scrollytelling/home/mountHomeScroll.ts` — home-only GSAP/ScrollTrigger integration and DOM state projection.
- `src/scrollytelling/home/mountHomeScroll.test.ts` — ScrollTrigger lifecycle, reduced motion, event, and CSS-variable tests.
- `src/scrollytelling/home/HomeAsciiField.ts` — deterministic ASCII canvas renderer implementing the shared controller contract.
- `src/scrollytelling/home/HomeAsciiField.test.ts` — character ramp, density caps, resize, reverse, and disposal tests.
- `src/scrollytelling/home/HomeTopologyController.ts` — owned `ThreeDScene`, `ThreeDAxes`, `Surface3D`, and `Dot3D` lifecycle.
- `src/scrollytelling/home/HomeTopologyController.test.ts` — headless/mocked Manim state, render batching, resize, context loss, and disposal tests.
- `src/components/home/HomeManimScene.tsx` — decorative React island coordinating both visual controllers.
- `src/components/home/HomeManimScene.test.tsx` — async lifecycle, latest-progress replay, fallback, observer, and cleanup tests.
- `src/components/home/HomeScrollytelling.astro` — static story copy, fallback art, latest post anchors, and archive summary.
- `src/styles/home-scrollytelling.css` — immersive home chrome, sticky enhancement, chapter transitions, responsive layout, reduced-motion and fallback rules.
- `docs/scrollytelling.md` — extension contract for later study and portfolio scenes.

### Modify

- `package.json` and `package-lock.json` — add exact `gsap` dependency.
- `src/pages/index.astro` — replace the old hero/topic grid with the new home composition and pass at most three posts.
- `src/layouts/BaseLayout.astro` — add an optional `default | immersive` layout variant without changing default routes.
- `src/components/navigation/SiteHeader.astro` — render the home variant as `[INDEX]` and `[ARCHIVE]`, with Index targeting `#home-index`.
- `src/styles/global.css` — remove rules used only by the old home hero/topic grid; retain shared listing/article rules.
- `tests/home.spec.ts` — replace old static-ASCII expectations with scrollytelling, fallback, accessibility, responsive, and route-isolation coverage.

---

## Task 1: Install GSAP and Lock the Pure Timeline Contract

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/scrollytelling/ScrollSceneController.ts`
- Create: `src/scrollytelling/home/homeTimeline.ts`
- Test: `src/scrollytelling/home/homeTimeline.test.ts`

- [ ] **Step 1: Install the exact GSAP version**

Run:

```bash
npm install --save-exact gsap@3.15.0
```

Expected: `package.json` contains `"gsap": "3.15.0"`, the lockfile changes, and no direct `three` dependency appears.

- [ ] **Step 2: Write failing timeline tests**

Create tests that exercise public behavior, including these exact assertions:

```ts
import { describe, expect, it } from 'vitest';

import { sampleHomeTimeline } from './homeTimeline';

describe('sampleHomeTimeline', () => {
  it.each([
    [-1, 0, 'emergence'],
    [0.2, 0.2, 'topology'],
    [0.47, 0.47, 'statement'],
    [0.68, 0.68, 'dissolution'],
    [0.9, 0.9, 'reconstruction'],
    [2, 1, 'reconstruction'],
  ] as const)('clamps %s and selects its chapter', (input, progress, chapter) => {
    expect(sampleHomeTimeline(input)).toMatchObject({ progress, chapter });
  });

  it('returns identical state for identical progress', () => {
    expect(sampleHomeTimeline(0.673)).toEqual(sampleHomeTimeline(0.673));
  });

  it('can be sampled backwards without retaining later state', () => {
    sampleHomeTimeline(0.95);
    expect(sampleHomeTimeline(0.1)).toEqual(sampleHomeTimeline(0.1));
    expect(sampleHomeTimeline(0.1).indexOpacity).toBe(0);
  });
});
```

- [ ] **Step 3: Run the focused test and confirm the red state**

Run:

```bash
npm test -- src/scrollytelling/home/homeTimeline.test.ts
```

Expected: FAIL because `homeTimeline.ts` does not exist.

- [ ] **Step 4: Implement the reusable contract and pure sampler**

Use this exact shared interface:

```ts
export interface ScrollSceneController {
  setProgress(progress: number): void;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}

export function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
}
```

Define `HomeChapter` and `HomeTimelineState` with, at minimum, `progress`, `chapter`, `topologyOpacity`, `statementOpacity`, `asciiOpacity`, `indexOpacity`, `surfaceAmplitude`, `surfaceFrequency`, `cameraPhi`, `cameraTheta`, and `cameraDistance`. Use the approved boundaries `0.14`, `0.38`, `0.56`, and `0.80`. Implement interpolation with pure helpers such as:

```ts
function segment(progress: number, start: number, end: number): number {
  return clampProgress((progress - start) / (end - start));
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value);
}
```

The returned state must be newly calculated on every call and must not read wall-clock time or module-level mutable state.

- [ ] **Step 5: Add boundary and visual-envelope assertions**

Assert that topology peaks before dissolution, statement is readable at `0.47`, ASCII peaks between `0.56` and `0.80`, index opacity reaches `1` at `1`, and all opacity values stay in `0..1` for progress samples from `0` through `1` in `0.01` increments.

- [ ] **Step 6: Run focused tests and type checking**

Run:

```bash
npm test -- src/scrollytelling/home/homeTimeline.test.ts
npm run check
```

Expected: both commands PASS.

- [ ] **Step 7: Commit the timeline foundation**

```bash
git add package.json package-lock.json src/scrollytelling/ScrollSceneController.ts src/scrollytelling/home/homeTimeline.ts src/scrollytelling/home/homeTimeline.test.ts
git commit -m "feat: define home scroll timeline"
```

---

## Task 2: Build a Batched Progress Driver and Home Scroll Mount

**Files:**

- Create: `src/scrollytelling/ScrollProgressDriver.ts`
- Test: `src/scrollytelling/ScrollProgressDriver.test.ts`
- Create: `src/scrollytelling/home/mountHomeScroll.ts`
- Test: `src/scrollytelling/home/mountHomeScroll.test.ts`

- [ ] **Step 1: Write failing requestAnimationFrame coalescing tests**

Use an injected scheduler so Vitest does not depend on browser timing:

```ts
it('publishes only the newest progress once per animation frame', () => {
  const callbacks = new Map<number, FrameRequestCallback>();
  const listener = vi.fn();
  const driver = new ScrollProgressDriver(listener, {
    request: (callback) => {
      callbacks.set(1, callback);
      return 1;
    },
    cancel: (id) => callbacks.delete(id),
  });

  driver.push(0.1);
  driver.push(0.35);
  driver.push(0.2);

  expect(callbacks.size).toBe(1);
  callbacks.get(1)?.(0);
  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener).toHaveBeenCalledWith(0.2);
});
```

Also test clamping, a later decreasing value, and `dispose()` canceling the queued callback and suppressing future notifications.

- [ ] **Step 2: Confirm the focused red state**

Run:

```bash
npm test -- src/scrollytelling/ScrollProgressDriver.test.ts
```

Expected: FAIL because the driver is missing.

- [ ] **Step 3: Implement the driver**

The driver stores only the latest clamped value, schedules at most one callback, and is idempotently disposable. Do not attach DOM or GSAP concerns to this class.

- [ ] **Step 4: Write failing mount tests with a mocked ScrollTrigger**

Cover these behaviors:

- `gsap.registerPlugin(ScrollTrigger)` is called once when the module is mounted.
- `ScrollTrigger.create()` uses `start: 'top top'`, `end: 'bottom bottom'`, and no `pin` option because CSS owns stickiness.
- An update at `progress: 0.68` eventually sets `data-home-chapter="dissolution"`, updates `--home-progress`, and dispatches `home-scrolly:progress` with the sampled state.
- A later update at `0.1` restores `data-home-chapter="emergence"`.
- A reduced-motion media query avoids creating a ScrollTrigger, sets `data-motion="reduced"`, and dispatches one stable visual state.
- Cleanup kills the trigger, removes media-query listeners, and disposes the progress driver exactly once.

- [ ] **Step 5: Implement `mountHomeScroll`**

Export a function with this boundary:

```ts
export interface HomeScrollDetail {
  state: HomeTimelineState;
}

export function mountHomeScroll(root: HTMLElement): () => void;
```

On normal motion, set `root.dataset.enhanced = 'true'`, create one trigger, and feed updates to `ScrollProgressDriver`. Project state using `root.style.setProperty()` and a bubbling `CustomEvent<HomeScrollDetail>`. On reduced motion, do not set the enhanced sticky height; use a stable topology sample while CSS forces the title and index into normal flow.

- [ ] **Step 6: Run both unit suites**

Run:

```bash
npm test -- src/scrollytelling/ScrollProgressDriver.test.ts src/scrollytelling/home/mountHomeScroll.test.ts
```

Expected: PASS with no leaked timers or animation frames.

- [ ] **Step 7: Commit the progress pipeline**

```bash
git add src/scrollytelling/ScrollProgressDriver.ts src/scrollytelling/ScrollProgressDriver.test.ts src/scrollytelling/home/mountHomeScroll.ts src/scrollytelling/home/mountHomeScroll.test.ts
git commit -m "feat: batch home scroll progress"
```

---

## Task 3: Implement the Deterministic ASCII Dissolution Layer

**Files:**

- Create: `src/scrollytelling/home/HomeAsciiField.ts`
- Test: `src/scrollytelling/home/HomeAsciiField.test.ts`

- [ ] **Step 1: Write failing pure-output and lifecycle tests**

Use a fake 2D canvas context and assert:

- the density ramp is exactly `['.', '·', '+', '/', '#', '%']`;
- the same dimensions, progress, and pointer produce the same character/cell output;
- decreasing progress redraws the earlier frame rather than continuing a simulation;
- a `390px` viewport produces no more than 48 columns and DPR is capped at `1.25`;
- a desktop viewport produces no more than 108 columns and DPR is capped at `1.75`;
- `resize()` updates backing-store dimensions without changing the current progress;
- `dispose()` removes pointer listeners and is safe twice;
- a missing 2D context throws during construction so the React island can hide only this decorative layer.

Use the controller only through the shared contract in at least one test:

```ts
const controller: ScrollSceneController = new HomeAsciiField(canvas, {
  mobile: true,
});

controller.resize(390, 844, 3);
controller.setProgress(0.68);
controller.setProgress(0.2);
controller.dispose();
controller.dispose();
```

- [ ] **Step 2: Confirm the focused red state**

Run:

```bash
npm test -- src/scrollytelling/home/HomeAsciiField.test.ts
```

Expected: FAIL because `HomeAsciiField` is missing.

- [ ] **Step 3: Implement a progress-derived field, not a time simulation**

Calculate each cell from normalized coordinates, a fixed integer hash, the current progress, and the normalized pointer. Use a deterministic field such as:

```ts
const wave =
  Math.sin(x * 0.17 + progress * 7.2) +
  Math.cos(y * 0.23 - progress * 5.4) +
  Math.sin((x + y) * 0.09 + progress * 3.1);
```

Map the normalized result into the approved character ramp, draw with a home-local monospace font, and use `#5b7cfa` only for the nearest tracking cell. Do not start a persistent animation loop. `setProgress()` performs one redraw; the upstream driver already batches calls.

- [ ] **Step 4: Add transient observation labels and pointer input**

Draw `STATISTICS`, `MACHINE LEARNING`, `AI`, and `MATHEMATICS` only during the dissolution envelope. Choose visibility from progress windows, not randomness or elapsed time, so reverse scrolling reconstructs the same frames.

Add a home-specific `setPointer(x: number, y: number, active: boolean)` method in addition to the shared controller interface. This method stores only normalized input and marks the next frame dirty; it does not draw immediately. A following `setProgress()` samples the same field deterministically from progress plus pointer input.

- [ ] **Step 5: Run the focused suite**

Run:

```bash
npm test -- src/scrollytelling/home/HomeAsciiField.test.ts
```

Expected: PASS, including mobile density and idempotent cleanup assertions.

- [ ] **Step 6: Commit the ASCII layer**

```bash
git add src/scrollytelling/home/HomeAsciiField.ts src/scrollytelling/home/HomeAsciiField.test.ts
git commit -m "feat: add deterministic home ascii field"
```

---

## Task 4: Build the Owned `manim-web` Topology Controller

**Files:**

- Create: `src/scrollytelling/home/HomeTopologyController.ts`
- Test: `src/scrollytelling/home/HomeTopologyController.test.ts`

- [ ] **Step 1: Write failing controller tests with `manim-web` mocked at the module boundary**

The fake scene must record constructor options, added mobjects, `camera3D.orbit()`, `renderer.getThreeRenderer().setPixelRatio()`, `resize()`, `render()`, `clear()`, and `dispose()`. The fake surface must record `setFunc()` calls. Assert:

- the scene uses `enableOrbitControls: false`, `backgroundColor: '#0a0a0a'`, and a capped initial pixel ratio;
- desktop uses at most `18 × 18`, mobile at most `12 × 12` surface resolution;
- `setProgress(0.25)` updates the surface function and camera without `scene.play()`;
- one `setProgress()` call performs at most one explicit `scene.render()` after using `scene.camera3D.orbit()` directly;
- repeated equal progress does not rebuild geometry;
- progress after topology has disappeared does not call `Surface3D.setFunc()`;
- decreasing progress restores the earlier camera and surface function output;
- equal progress plus equal normalized pointer input produces equal local-peak geometry;
- `setPointer()` marks geometry dirty but does not render until the next batched `setProgress()`;
- `resize(1440, 900, 3)` applies DPR `1.75` before `scene.resize(1440, 900)`;
- a captured `webglcontextlost` event prevents default, switches the supplied failure callback once, and keeps cleanup safe;
- `dispose()` removes the context listener, clears and disposes the scene once, and ignores later updates.

- [ ] **Step 2: Confirm the focused red state**

Run:

```bash
npm test -- src/scrollytelling/home/HomeTopologyController.test.ts
```

Expected: FAIL because the controller is missing.

- [ ] **Step 3: Implement creation and owned lifecycle**

The module may statically import Manim runtime symbols because the entire controller module will be dynamically imported by the React island. Construct:

```ts
const scene = new ThreeDScene(container, {
  antialias: true,
  autoResize: false,
  backgroundColor: '#0a0a0a',
  backgroundOpacity: 0,
  enableOrbitControls: false,
  pixelRatio,
  powerPreference: 'high-performance',
});

const surface = new Surface3D({
  color: '#efede6',
  func: createSurfaceFunction(sampleHomeTimeline(0)),
  opacity: 0.72,
  uRange: [-4.5, 4.5],
  uResolution: resolution,
  vRange: [-4.5, 4.5],
  vResolution: resolution,
  wireframe: true,
});
```

Add restrained `ThreeDAxes` and a small `Dot3D` set. Keep the mobject count fixed after construction.

- [ ] **Step 4: Implement direct progress sampling**

For a changed visible topology frame, call `surface.setFunc()` once, call `scene.camera3D.orbit(phi, theta, distance)` rather than `scene.setCameraOrientation()` to avoid its internal render, then call `scene.render()` once. Stop geometry updates when `topologyOpacity === 0`. Add `setPointer(x, y, active)` as a home-specific extension that stores a small normalized local-bias input and marks the next sampled frame dirty without rendering immediately. Do not add `ValueTracker` animation or `scene.play()` to the scrub path.

- [ ] **Step 5: Implement resize and WebGL failure behavior**

Before `scene.resize(width, height)`, call `scene.renderer.getThreeRenderer().setPixelRatio(cappedPixelRatio)`. Listen for `webglcontextlost` on the owned canvas in capture mode, call the provided `onFailure`, and retain static HTML/fallback responsibility outside this controller.

- [ ] **Step 6: Run focused and existing Manim tests**

Run:

```bash
npm test -- src/scrollytelling/home/HomeTopologyController.test.ts src/components/visualizations/linear-regression/LinearRegressionSceneController.test.ts src/components/manim/ResponsiveManimScene.test.tsx
```

Expected: PASS; the current 2D article visualizations remain unchanged.

- [ ] **Step 7: Commit the topology controller**

```bash
git add src/scrollytelling/home/HomeTopologyController.ts src/scrollytelling/home/HomeTopologyController.test.ts
git commit -m "feat: add manim topology controller"
```

---

## Task 5: Coordinate Visual Controllers in a Home-Only React Island

**Files:**

- Create: `src/components/home/HomeManimScene.tsx`
- Test: `src/components/home/HomeManimScene.test.tsx`

- [ ] **Step 1: Write failing island lifecycle tests**

Mock dynamic imports for both controllers and verify:

- both controller modules load only after the component mounts;
- progress events received before async creation completes are replayed once to the created controllers;
- a single `ResizeObserver` calls both `resize()` methods with capped DPR;
- an ASCII constructor failure marks only `data-ascii-status="error"` while topology stays ready;
- a topology creation failure marks `data-topology-status="error"` and exposes the static ASCII fallback layer rather than an alert that interrupts reading;
- document visibility prevents progress delivery while hidden and replays the newest progress when visible;
- pointer/touch moves are coalesced into one animation frame, update both controllers’ optional pointer input, and then replay the current progress exactly once;
- unmount disconnects the observer, removes listeners, and disposes each created controller once, including React Strict Mode remounts.

- [ ] **Step 2: Confirm the focused red state**

Run:

```bash
npm test -- src/components/home/HomeManimScene.test.tsx
```

Expected: FAIL because the component is missing.

- [ ] **Step 3: Implement decorative, independent layers**

Return one `aria-hidden="true"` visual root containing a Manim container and an ASCII `<canvas>`. Listen for the bubbling `home-scrolly:progress` event on the nearest `[data-home-scrolly]` root. Keep the last normalized progress in a ref.

- [ ] **Step 4: Dynamically import controllers inside `useEffect`**

Use separate imports so either layer can fail independently:

```ts
const topologyModule = import('../../scrollytelling/home/HomeTopologyController');
const asciiModule = import('../../scrollytelling/home/HomeAsciiField');
```

After creation, immediately apply the latest progress and measured dimensions. Catch each promise independently and set data-status attributes; do not remove or cover the Astro text. Attach passive pointer/touch listeners to the decorative root, normalize positions to `0..1`, and batch them with one requestAnimationFrame before calling each optional `setPointer()` and replaying the current progress.

- [ ] **Step 5: Run the React suite**

Run:

```bash
npm test -- src/components/home/HomeManimScene.test.tsx src/components/manim/ResponsiveManimScene.test.tsx
```

Expected: PASS with no unhandled promise rejection or duplicate cleanup.

- [ ] **Step 6: Commit the visual island**

```bash
git add src/components/home/HomeManimScene.tsx src/components/home/HomeManimScene.test.tsx
git commit -m "feat: coordinate home visual layers"
```

---

## Task 6: Replace the Homepage with Static Astro Story Content

**Files:**

- Create: `src/components/home/HomeScrollytelling.astro`
- Create: `src/styles/home-scrollytelling.css`
- Modify: `src/pages/index.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/navigation/SiteHeader.astro`
- Modify: `src/styles/global.css`
- Test: `tests/home.spec.ts`

- [ ] **Step 1: Replace old home assertions with failing static-content tests**

At `390`, `768`, and `1440` pixel widths assert:

```ts
await expect(
  page.getByRole('heading', { level: 1, name: '불확실성 속에서 구조를 찾습니다.' }),
).toHaveCount(1);
await expect(
  page.getByText('통계, 머신러닝, 인공지능을 움직이며 이해하고 기록합니다.'),
).toHaveCount(1);
await expect(page.getByRole('link', { name: '[SKIP TO INDEX]' })).toHaveAttribute(
  'href',
  '#home-index',
);
await expect(page.getByRole('link', { name: '[ENTER THE ARCHIVE →]' })).toHaveAttribute(
  'href',
  '/posts/',
);
expect(await page.locator('[data-home-post]').count()).toBeLessThanOrEqual(3);
await expect(page.locator('[data-ascii-id="site-hero"]')).toHaveCount(0);
```

Also keep the existing absolute Open Graph image assertion and horizontal-overflow assertion.

- [ ] **Step 2: Run the home test and confirm it fails against the old hero**

Run:

```bash
npm run test:e2e -- tests/home.spec.ts
```

Expected: FAIL because the approved headline and home scrollytelling markup do not exist.

- [ ] **Step 3: Add the optional immersive layout variant**

Extend `BaseLayout.astro` props without changing the default:

```ts
type LayoutVariant = 'default' | 'immersive';

interface Props {
  title: string;
  description: string;
  image?: string;
  layout?: LayoutVariant;
}

const { title, description, image, layout = 'default' } = Astro.props;
```

Set `data-layout={layout}` on `<body>` and `.site-frame`, and pass `variant={layout}` to `SiteHeader`. For the immersive header, render actual link text `[INDEX]` and `[ARCHIVE]`; use `#home-index` only for immersive Index. Default routes retain the current home and posts URLs and current labels.

- [ ] **Step 4: Build `HomeScrollytelling.astro` from static HTML first**

Accept `posts: readonly Post[]`, `totalPosts: number`, and `latestUpdatedAt?: Date`. Render in document order:

1. `[SKIP TO INDEX]` real fragment anchor.
2. Decorative fallback `<pre aria-hidden="true">` using a new short topology-like pattern, not the `site-hero` registry asset.
3. Status `00::OBSERVING`.
4. `<h1>` containing `불확실성 속에서<br />구조를 찾습니다.`.
5. The approved description.
6. `<section id="home-index">` with one wrapping anchor per real post, title, date, category, and description.
7. `[ENTER THE ARCHIVE →]`, total count, and latest update date.

Do not nest topic anchors inside the post-row anchor. Add `<HomeManimScene client:load />` only inside the decorative layer.

- [ ] **Step 5: Replace `index.astro` data wiring**

Use the existing source of truth:

```ts
const allPosts = await getPublishedPosts();
const posts = allPosts.slice(0, 3);
const latestUpdatedAt = allPosts[0]?.data.updatedAt ?? allPosts[0]?.data.publishedAt;
```

Render `HomeScrollytelling` inside `<BaseLayout layout="immersive">`. Remove imports and rendering for `AsciiArt`, `MechanicalLabel`, `PostRow`, `homeSubjects`, and the old topic grid.

- [ ] **Step 6: Mount the home scroll module from the Astro component**

Add a bundled component-local script that finds every `[data-home-scrolly]`, calls `mountHomeScroll`, and disposes the mount on Astro page lifecycle events. The current site is static, but the cleanup keeps the component safe for later view transitions.

- [ ] **Step 7: Implement the approved visual system**

In `home-scrollytelling.css`:

- define only home-scoped tokens for black, warm paper, gray, and cobalt;
- make the immersive site frame full width with no side borders;
- place the header as a transparent overlay with the wordmark and two bracket links;
- keep default/no-JavaScript content in normal flow and readable;
- only `[data-enhanced="true"]` gets `min-height: 320svh` and a `position: sticky; min-height: 100svh` visual stage;
- use CSS variables from the sampled timeline for opacity and transform;
- avoid rounded cards, box shadows, and repeated row borders;
- use whitespace, type scale, and opacity to separate latest posts;
- use `220svh` on screens below `640px` and a single-column post index;
- under `prefers-reduced-motion: reduce`, remove the long height/sticky state and show title plus posts in normal flow;
- when topology status is error, reveal the static ASCII fallback; when ASCII status is error, hide only the canvas.

Remove only old-home selectors (`.home-hero*`, `.recent-notes`, `.topic-index*`) from `global.css`. Keep generic `.bracket-link`, `.section-heading`, listing, post, and article rules if any non-home route still references them; confirm with `rg` before deletion.

- [ ] **Step 8: Run home, check, and unit tests**

Run serially:

```bash
npm run check
npm test
npm run test:e2e -- tests/home.spec.ts
```

Expected: PASS. At each viewport, `document.documentElement.scrollWidth === window.innerWidth`.

- [ ] **Step 9: Commit the Astro homepage**

```bash
git add src/components/home/HomeScrollytelling.astro src/styles/home-scrollytelling.css src/pages/index.astro src/layouts/BaseLayout.astro src/components/navigation/SiteHeader.astro src/styles/global.css tests/home.spec.ts
git commit -m "feat: replace home with topology scrollytelling"
```

---

## Task 7: Verify Scroll States, Reverse Motion, Fallbacks, and Route Isolation

**Files:**

- Modify: `tests/home.spec.ts`

- [ ] **Step 1: Add failing chapter and reverse-scroll coverage**

Scroll the `[data-home-scrolly]` root to approximately 20%, 47%, 68%, and 92% of its scrollable range and wait for `data-home-chapter` to become `topology`, `statement`, `dissolution`, and `reconstruction`. At Statement, assert the headline and description are visible. At Reconstruction, assert the post index and archive CTA are visible. Then scroll back to the root top and assert `emergence`. Read the root’s bounding rectangle and scroll height rather than hard-coding page pixels.

- [ ] **Step 2: Add keyboard and real-link coverage**

Focus the first `[data-home-post]`, assert a visible solid focus outline, press Enter, and assert navigation to the real post URL. Confirm `[SKIP TO INDEX]` and the header `[INDEX]` both target `#home-index` without click interception.

- [ ] **Step 3: Add reduced-motion coverage**

Use `page.emulateMedia({ reducedMotion: 'reduce' })`, reload, and assert:

- `data-motion="reduced"`;
- the visual stage’s computed `position` is not `sticky` and the root has no explicit `320svh`/`220svh` enhancement height;
- the headline, first post, and archive link are immediately visible;
- no ScrollTrigger spacer or extra pin wrapper exists.

- [ ] **Step 4: Add JavaScript-disabled and forced-WebGL-failure coverage**

Create a Playwright context with `javaScriptEnabled: false` and assert the headline, all real post anchors, and archive link remain readable. In a separate normal context, use `addInitScript()` before navigation to make WebGL context requests return `null`; assert topology status becomes error while the same static content and links remain available.

- [ ] **Step 5: Add home-chunk isolation coverage**

Start request recording before visiting `/posts/`. Assert no requested URL contains `HomeManimScene`, `/src/scrollytelling/home/`, or `gsap`. Also assert the archive page has no `[data-home-scrolly]` and no home visual canvas. This test uses the existing dev server, where module paths remain inspectable.

- [ ] **Step 6: Run the full Playwright suite**

Run:

```bash
npm run test:e2e
```

Expected: PASS for home, archive, topic, post, 404, and smoke tests.

- [ ] **Step 7: Commit behavioral coverage**

```bash
git add tests/home.spec.ts
git commit -m "test: cover home scroll fallbacks"
```

---

## Task 8: Document the Reusable Scrollytelling Foundation

**Files:**

- Create: `docs/scrollytelling.md`

- [ ] **Step 1: Document the extension boundary**

Describe:

- Astro owns semantic content and links;
- a route-local mount maps scroll position to normalized progress;
- every visual implements `ScrollSceneController`;
- pure timeline functions are the source of reversible state;
- Manim modules are dynamically imported by the consuming island;
- Markdown stays free of framework code;
- future study/portfolio routes register their own scene modules rather than importing home controllers.

Include this concrete future-scene example:

```ts
export class StudySceneController implements ScrollSceneController {
  setProgress(progress: number): void {
    const clamped = clampProgress(progress);
    this.applySample(this.sample(clamped));
  }

  resize(width: number, height: number, pixelRatio: number): void {
    this.viewport = { width, height, pixelRatio };
    this.render();
  }

  dispose(): void {
    this.releaseOnce();
  }
}
```

State explicitly that the example is an architectural contract, not code to paste into Markdown.

- [ ] **Step 2: Run documentation-sensitive checks**

Run:

```bash
npm run check
npm test -- src/content/authoring-policy.test.ts src/integrations/visualization-slots.test.ts src/visualizations/manifest.test.ts
```

Expected: PASS; the current authoring policy and visualization manifest remain intact.

- [ ] **Step 3: Commit the foundation documentation**

```bash
git add docs/scrollytelling.md
git commit -m "docs: explain scroll scene extension"
```

---

## Task 9: Full Verification, Spec Audit, and Draft Pull Request

**Files:**

- Verify: all changed files
- Reference: `docs/superpowers/specs/2026-08-15-home-scrollytelling-manim-design.md`
- Reference: GitHub issue #5

- [ ] **Step 1: Audit implementation against the approved spec**

Check every requirement in the design document. In particular verify:

- 75/25 artwork-to-navigation balance is visible in the first viewport;
- all five chapters exist at the approved boundaries;
- title and description copy are exact;
- latest posts are real, capped at three, and never padded;
- `site-hero` is retained but absent from home;
- non-home routes use the default frame and load no home runtime;
- mobile height is `220svh`, desktop is approximately `320svh`;
- no direct `three`, remote font, image, CMS, portfolio route, or post conversion was added.

- [ ] **Step 2: Scan for placeholders and unsafe scrub animation**

Run:

```bash
rg -n "TODO|TBD|placeholder|scene\.play\(" src/scrollytelling src/components/home docs/scrollytelling.md
```

Expected: no placeholders; no `scene.play()` in the home scroll path.

- [ ] **Step 3: Run the full serial verification**

Run exactly in this order:

```bash
npm run check
npm test
npm run build
npm run test:e2e
```

Expected: all four commands exit `0`. Do not report completion from partial or cached output.

- [ ] **Step 4: Inspect the production bundle and generated HTML**

Run:

```bash
rg -n "HomeManimScene|HomeTopologyController|gsap" dist/posts dist/topics
rg -n "불확실성 속에서|ENTER THE ARCHIVE|home-index" dist/index.html
```

Expected: the first command returns no matches; the second finds all three static-content markers. If hashed chunks hide module names, inspect `dist/posts/index.html` and its modulepreload/import entries and confirm none resolve to the home entry graph.

- [ ] **Step 5: Inspect the final diff and commit state**

Run:

```bash
git diff --check
git status --short
git log --oneline --decorate -12
```

Expected: no whitespace errors, no unintended files, and all planned commits are present on `codex/home-scrollytelling`.

- [ ] **Step 6: Request code review using the required review skill**

Invoke `superpowers:requesting-code-review`, provide the approved spec path and the branch diff from `main`, and address only verified issues within scope.

- [ ] **Step 7: Re-run affected tests after review fixes**

Run the focused suite for each changed area, then repeat the four full verification commands from Step 3.

- [ ] **Step 8: Push and open a draft PR**

Invoke `github:yeet` to confirm scope, push `codex/home-scrollytelling`, and open a draft pull request. The PR body must:

- summarize the artwork-first home and reusable scroll controller;
- list `npm run check`, `npm test`, `npm run build`, and `npm run test:e2e` as verified;
- state that it partially addresses only the homepage portion of issue #5 without closing it;
- call out `manim-web`/GSAP home-only loading, reduced-motion behavior, and static fallback;
- leave merge and GitHub Pages deployment for user review.
