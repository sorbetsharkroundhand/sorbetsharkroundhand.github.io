# Interactive Learning Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a static MDX learning notebook at `https://sorbetsharkroundhand.github.io/` whose first Korean article teaches linear regression through a responsive, interactive `manim-web` visualization.

**Architecture:** Astro generates real HTML pages and content-collection routes; React islands own interactive controls and load only when visible. Pure TypeScript owns regression calculations, while a focused scene controller owns stable `manim-web` mobjects, tracker animation, rendering, and cleanup.

**Tech Stack:** Astro 7.2.0, TypeScript 7.0.2, React 19.2.8, MDX, `manim-web` 0.3.24, KaTeX 0.18.2, Vitest 4.1.10, Playwright 1.62.1, CSS, GitHub Actions, GitHub Pages, Node 24.

## Global Constraints

- Production URL is `https://sorbetsharkroundhand.github.io/`; the default base path is `/`.
- Read `DEPLOY_BASE` in Astro configuration so a project site can set `/repository-name/` without source rewrites.
- Use `manim-web@0.3.24` as an npm dependency; do not fork or vendor the library.
- Remove the existing Python Manim submodule, `.gitmodules`, and obsolete showcase design document.
- Keep prose in MDX and visualization logic outside MDX.
- Use KaTeX for article equations and `manim-web` `MathTex` for the in-Scene model label.
- React owns displayed slope, intercept, MSE, reduced-motion, and animation status.
- A scene controller owns manim mobjects and never recreates the Scene for slider changes.
- Disable all figure controls while `Scene.play()` is active; do not promise animation cancellation.
- Use `client:visible` for the visualization island.
- The first milestone makes no remote font requests and has no analytics, CMS, search, accounts, or backend.
- Meet keyboard, focus, contrast, live-status, touch-target, and `prefers-reduced-motion` requirements.
- Run type checks, unit tests, production build, Playwright tests, and manual visual QA before completion.
- During Task 3, the main agent must read and apply `frontend-design`, `apple-design`, and `emil-design-eng` before editing UI files.
- During Task 9, the main agent must read and apply `review-animations` before accepting the final motion implementation.

---

## File map

### Repository and configuration

- Delete `.gitmodules`: removes the obsolete Python submodule declaration.
- Delete `third_party/manim`: removes the obsolete submodule gitlink.
- Delete `docs/superpowers/specs/2026-08-09-manim-inspired-github-pages-design.md`: removes the superseded design.
- Create `package.json`: pins scripts and runtime/test dependencies.
- Create `package-lock.json`: reproducible npm installation.
- Create `astro.config.ts`: React, MDX, KaTeX, site, and base configuration.
- Create `tsconfig.json`: strict Astro/TypeScript settings.
- Create `vitest.config.ts`: Node unit-test configuration.
- Create `playwright.config.ts`: local preview and browser projects.
- Create `.gitignore`: excludes generated dependencies, output, and test artifacts.

### Static application and content

- Create `src/content.config.ts`: validates post frontmatter.
- Create `src/content/posts/linear-regression.mdx`: substantive Korean lesson.
- Create `src/layouts/BaseLayout.astro`: document shell and metadata.
- Create `src/layouts/PostLayout.astro`: article header, prose, and wide-figure frame.
- Create `src/components/navigation/SiteHeader.astro`: primary navigation.
- Create `src/components/navigation/SiteFooter.astro`: notebook identity and source link.
- Create `src/components/article/InteractiveFigure.astro`: reusable static figure shell for non-React figures.
- Create `src/pages/index.astro`: home identity, topics, and latest posts.
- Create `src/pages/posts/index.astro`: all published posts.
- Create `src/pages/posts/[...slug].astro`: static MDX post routes.
- Create `src/pages/topics/[topic].astro`: static topic routes.
- Create `src/styles/tokens.css`: color, spacing, typography, radius, shadow, and motion tokens.
- Create `src/styles/global.css`: reset, typography, prose, responsive layout, and accessibility styles.
- Create `src/utils/urls.ts`: one base-aware internal URL helper.

### Regression feature

- Create `src/components/visualizations/linear-regression/regressionData.ts`: deterministic study-hours dataset and initial parameters.
- Create `src/components/visualizations/linear-regression/regressionMath.ts`: pure prediction, residual, MSE, and least-squares functions.
- Create `src/components/visualizations/linear-regression/regressionMath.test.ts`: pure-math tests.
- Create `src/components/manim/ResponsiveManimScene.tsx`: Scene creation, auto-resize, fallback, and disposal.
- Create `src/components/manim/ManimErrorBoundary.tsx`: visualization-only React failure boundary.
- Create `src/components/controls/ParameterSlider.tsx`: labeled accessible range control.
- Create `src/components/controls/FigureButton.tsx`: tactile action button.
- Create `src/components/visualizations/linear-regression/LinearRegressionSceneController.ts`: stable manim graph and animation bridge.
- Create `src/components/visualizations/linear-regression/LinearRegressionDemo.tsx`: React state, controls, metrics, and scene composition.
- Create `src/components/visualizations/linear-regression/linear-regression.css`: figure-specific responsive styling.

### Validation and deployment

- Create `tests/blog.spec.ts`: navigation, direct-load, reload, MDX, and KaTeX tests.
- Create `tests/linear-regression.spec.ts`: sliders, MSE, best fit, reset, reduced motion, and responsive tests.
- Create `.github/workflows/deploy.yml`: check, test, build, artifact upload, and Pages deployment.
- Create `README.md`: local commands, authoring workflow, Pages setup, and manim findings.

---

### Task 1: Replace obsolete repository contents with a buildable Astro baseline

**Files:**
- Delete: `.gitmodules`
- Delete: `third_party/manim`
- Delete: `docs/superpowers/specs/2026-08-09-manim-inspired-github-pages-design.md`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `astro.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`
- Create: `src/pages/index.astro`

**Interfaces:**
- Consumes: the approved design spec and root GitHub Pages repository.
- Produces: `npm run dev`, `npm run check`, `npm test`, `npm run build`, and `npm run test:e2e` scripts; `DEPLOY_BASE` configuration.

- [ ] **Step 1: Remove only the approved obsolete files**

Use an explicit patch that deletes `.gitmodules` and the old design file and removes the `third_party/manim` gitlink. Verify the removal target with `git ls-files .gitmodules third_party/manim docs/superpowers/specs/2026-08-09-manim-inspired-github-pages-design.md` before applying it.

- [ ] **Step 2: Create the pinned package manifest**

Create `package.json` with these scripts and dependency floors:

```json
{
  "name": "interactive-learning-notes",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@astrojs/mdx": "7.0.5",
    "@astrojs/react": "6.0.2",
    "astro": "7.2.0",
    "katex": "0.18.2",
    "manim-web": "0.3.24",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "rehype-katex": "7.0.1",
    "remark-math": "6.0.0"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.10",
    "@playwright/test": "1.62.1",
    "@types/katex": "0.16.8",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "typescript": "7.0.2",
    "vitest": "4.1.10"
  }
}
```

- [ ] **Step 3: Install dependencies and commit the generated lockfile**

Run: `npm install`

Expected: npm creates `package-lock.json` and exits successfully without peer-dependency errors.

- [ ] **Step 4: Add strict framework configuration**

Configure Astro with `react()`, `mdx()`, `remarkMath`, `rehypeKatex`, `site: 'https://sorbetsharkroundhand.github.io'`, and `base: process.env.DEPLOY_BASE ?? '/'`. Extend `astro/tsconfigs/strict` in `tsconfig.json`. Configure Vitest for `src/**/*.test.ts` with `passWithNoTests: true` so the baseline passes before Task 2 adds tests; configure Playwright to start `npm run dev -- --host 127.0.0.1` on port 4321 and reuse the server outside CI.

`astro.config.ts` must contain:

```ts
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

export default defineConfig({
  site: 'https://sorbetsharkroundhand.github.io',
  base: process.env.DEPLOY_BASE ?? '/',
  integrations: [react(), mdx()],
  markdown: { remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] },
});
```

- [ ] **Step 5: Add a minimal real page and ignore generated files**

Create `src/pages/index.astro` as a complete HTML page with title `Interactive Notes`, and ignore `node_modules/`, `dist/`, `.astro/`, `playwright-report/`, `test-results/`, and `.DS_Store`.

- [ ] **Step 6: Verify the baseline**

Run: `npm run check && npm test && npm run build`

Expected: all commands exit 0; `dist/index.html` exists and includes `Interactive Notes`.

- [ ] **Step 7: Commit the repository transition**

```bash
git add -A
git commit -m "chore: scaffold interactive notes site"
```

---

### Task 2: Build the regression math core with tests

**Files:**
- Create: `src/components/visualizations/linear-regression/regressionData.ts`
- Create: `src/components/visualizations/linear-regression/regressionMath.ts`
- Create: `src/components/visualizations/linear-regression/regressionMath.test.ts`

**Interfaces:**
- Consumes: no UI or manim APIs.
- Produces: `DataPoint`, `RegressionParameters`, `STUDY_DATA`, `INITIAL_PARAMETERS`, `predict`, `calculateResiduals`, `calculateMSE`, and `calculateLeastSquares`.

- [ ] **Step 1: Write the failing tests**

Use the deterministic dataset:

```ts
export const STUDY_DATA = [
  { x: 1, y: 52 }, { x: 2, y: 57 }, { x: 3, y: 61 }, { x: 4, y: 68 },
  { x: 5, y: 72 }, { x: 6, y: 78 }, { x: 7, y: 83 }, { x: 8, y: 88 },
] as const;

export const INITIAL_PARAMETERS = { slope: 3.5, intercept: 52 } as const;
```

Tests must assert:

```ts
expect(predict(3, 2, 4)).toBe(10);
expect(calculateResiduals([{ x: 1, y: 8 }], 2, 3)).toEqual([3]);
expect(calculateMSE([{ x: 1, y: 8 }], 2, 3)).toBe(9);
expect(calculateLeastSquares(STUDY_DATA).slope).toBeCloseTo(5.2023809524, 9);
expect(calculateLeastSquares(STUDY_DATA).intercept).toBeCloseTo(46.4642857143, 9);
expect(calculateMSE(STUDY_DATA, 5.2023809524, 46.4642857143)).toBeCloseTo(0.2693452381, 9);
expect(() => calculateLeastSquares([])).toThrow('at least one data point');
expect(() => calculateLeastSquares([{ x: 1, y: 2 }, { x: 1, y: 4 }])).toThrow('x variance');
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `npm test -- regressionMath.test.ts`

Expected: FAIL because the module exports do not exist.

- [ ] **Step 3: Implement typed pure calculations**

Define:

```ts
export interface DataPoint { x: number; y: number }
export interface RegressionParameters { slope: number; intercept: number }

export function predict(x: number, slope: number, intercept: number): number;
export function calculateResiduals(
  points: readonly DataPoint[], slope: number, intercept: number,
): number[];
export function calculateMSE(
  points: readonly DataPoint[], slope: number, intercept: number,
): number;
export function calculateLeastSquares(points: readonly DataPoint[]): RegressionParameters;
```

Residual is `observed - predicted`. MSE rejects an empty dataset. Least squares computes means, covariance numerator, x variance denominator, slope, and intercept; it throws when the x variance denominator is zero.

- [ ] **Step 4: Run focused and full tests**

Run: `npm test -- regressionMath.test.ts && npm test`

Expected: all assertions pass.

- [ ] **Step 5: Commit the math core**

```bash
git add src/components/visualizations/linear-regression
git commit -m "feat: add tested regression calculations"
```

---

### Task 3: Establish the visual system and static shell

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/global.css`
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/components/navigation/SiteHeader.astro`
- Create: `src/components/navigation/SiteFooter.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: approved visual direction and Astro baseline.
- Produces: CSS tokens, global accessibility rules, `BaseLayout`, site navigation, footer, and home hero.

- [ ] **Step 1: Read required design and motion skills before editing**

The main agent reads the complete `SKILL.md` files for `frontend-design`, `apple-design`, and `emil-design-eng`, including only references those files route to for this task. Record their concrete influence in the final handoff: surface hierarchy, typography, control affordance, motion restraint, and reduced-motion behavior.

- [ ] **Step 2: Define project-owned visual tokens**

Create tokens for paper `#f3f1ea`, elevated surface `#f7f6f1`, ink `#242722`, muted ink `#686d65`, cobalt `#465ee8`, coral `#d86558`, success `#357a5b`, border `rgba(50,55,48,.14)`, focus ring, 4/8/12/16/24/32/48/72 spacing, 12/18/28 radii, and three selective shadow levels. Define duration tokens at 120ms, 220ms, and 700ms and one physical easing curve. Override durations to near-zero under `prefers-reduced-motion`.

- [ ] **Step 3: Build semantic document chrome**

`BaseLayout.astro` accepts `{ title, description, image? }`, emits canonical metadata using `Astro.site`, imports KaTeX CSS and the global styles, and wraps a skip link, header, main slot, and footer. Header links are Home and Posts; topic links live in page content so the header stays quiet.

- [ ] **Step 4: Replace the baseline with the real home composition**

Create the exact hero copy:

```text
Interactive Notes
Statistics · Machine Learning · AI · Mathematics
Things I learned, visualized.
공식과 코드를 읽는 데서 멈추지 않고, 직접 움직이며 이해한 것들을 기록합니다.
```

Use one asymmetrical hero surface with a restrained coordinate-paper motif, one “첫 번째 노트 읽기” link, one recent-post region, and topic links. Do not create KPI cards, gradients, glass panels, or decorative animation loops.

- [ ] **Step 5: Verify static quality**

Run: `npm run check && npm run build`

Expected: zero errors; built HTML contains the Korean introduction, skip link, and navigation labels. Inspect at 390px and 1440px in a browser; confirm no horizontal overflow and visible keyboard focus.

- [ ] **Step 6: Commit the design foundation**

```bash
git add src/styles src/layouts src/components/navigation src/pages/index.astro
git commit -m "feat: add research notebook design system"
```

---

### Task 4: Add the validated MDX content system and static routes

**Files:**
- Create: `src/content.config.ts`
- Create: `src/layouts/PostLayout.astro`
- Create: `src/components/article/InteractiveFigure.astro`
- Create: `src/content/posts/linear-regression.mdx`
- Create: `src/pages/posts/index.astro`
- Create: `src/pages/posts/[...slug].astro`
- Create: `src/pages/topics/[topic].astro`
- Create: `src/utils/urls.ts`
- Modify: `src/pages/index.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `BaseLayout` and visual tokens.
- Produces: `posts` content collection, `/posts/`, `/posts/linear-regression/`, and `/topics/<topic>/` static pages.

- [ ] **Step 1: Define the content schema**

Use Astro's `glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' })` loader and a schema with title/description strings, coerced dates, category enum (`Statistics`, `Machine Learning`, `Deep Learning`, `Mathematics`, `Visualization`), topic string array, draft boolean default false, and wideFigures boolean default false.

- [ ] **Step 2: Create an article shell that renders real content**

`PostLayout.astro` accepts validated frontmatter, renders a back link, category, title, description, date, and a prose slot. It exposes CSS rules for `.article-prose`, `.wide-figure`, heading anchors, code, blockquotes, images, tables, inline code, and KaTeX overflow on narrow screens.

- [ ] **Step 3: Create the first MDX document without a fake visualization**

Add complete Korean prose for the seven approved sections. At the eventual figure location, use a semantic explanatory callout that states the interactive instrument is loaded below; do not draw a mock graph. Include these equations:

```mdx
$$\hat{y} = wx + b$$

$$r_i = y_i - \hat{y}_i$$

$$\operatorname{MSE} = \frac{1}{n}\sum_{i=1}^{n}(y_i-\hat{y}_i)^2$$
```

Explain slope, intercept, prediction, residual sign, squaring, average error, and why association is not causation. Use the study-hours dataset context without claiming it is real-world research data.

- [ ] **Step 4: Generate post and topic routes**

Use `getCollection('posts', ({ data }) => !data.draft)` and `render(entry)` in the catch-all page. Generate topic routes from unique `topics` values and sort posts newest first. Create `src/utils/urls.ts` with `withBase(path: string): string`, normalize one slash between `import.meta.env.BASE_URL` and the path, and use it for all internal links.

- [ ] **Step 5: Verify content and math output**

Run: `npm run check && npm run build`

Expected: `dist/posts/linear-regression/index.html` and topic pages exist; built post HTML contains `katex`, all seven headings, and no draft content.

- [ ] **Step 6: Commit the content system**

```bash
git add src/content.config.ts src/content src/layouts/PostLayout.astro src/components/article src/pages src/styles/global.css src/utils/urls.ts
git commit -m "feat: add MDX learning content system"
```

---

### Task 5: Build a StrictMode-safe responsive Manim Scene wrapper

**Files:**
- Create: `src/components/manim/ResponsiveManimScene.tsx`
- Create: `src/components/manim/ManimErrorBoundary.tsx`
- Create: `src/components/manim/responsive-manim-scene.css`

**Interfaces:**
- Consumes: `Scene` from `manim-web`.
- Produces: `ResponsiveManimSceneProps`, `SceneSetup`, and visualization fallback UI.

```ts
export interface SceneDisposable { dispose(): void }
export interface SceneSetupContext {
  scene: Scene;
  registerDisposable(disposable: SceneDisposable): void;
}
export type SceneCleanup = () => void;
export type SceneSetup = (
  context: SceneSetupContext,
) => void | SceneCleanup | Promise<void | SceneCleanup>;

export interface ResponsiveManimSceneProps {
  setup: SceneSetup;
  ariaLabel: string;
  className?: string;
  aspectRatio?: `${number} / ${number}`;
}
```

- [ ] **Step 1: Add the error boundary**

Create a class error boundary that accepts `children` and `fallback`, catches render errors, and preserves the surrounding article. The fallback copy is `이 인터랙티브 그래프를 표시하지 못했습니다. 본문과 수식은 계속 읽을 수 있습니다.`

- [ ] **Step 2: Implement one Scene lifecycle**

Use one container ref and one effect. Construct:

```ts
new Scene(container, {
  backgroundColor: '#f7f6f1',
  backgroundOpacity: 1,
  frameWidth: 12,
  frameHeight: 7.5,
  autoResize: true,
});
```

Do not pass pixel width or height. Maintain a local disposable set; `registerDisposable` adds interaction handles such as `Draggable`, `Clickable`, or `Hoverable`. Await `setup({ scene, registerDisposable })`, retain its cleanup only while mounted, and in effect cleanup invoke feature cleanup, dispose registered handles in reverse order, then call `scene.dispose()`. Guard async setup with a cancelled flag so a late cleanup runs immediately after unmount.

- [ ] **Step 3: Add loading and unsupported-WebGL fallbacks**

Render a stable aspect-ratio container with `role="img"` and the supplied label. Catch constructor/setup errors into component state. Keep loading copy outside the canvas so assistive technology receives status. Do not poll Scene state.

- [ ] **Step 4: Verify type and production bundling**

Run: `npm run check && npm run build`

Expected: zero errors; the static post HTML contains fallback/loading markup, and the home bundle does not reference the Linear Regression client chunk.

- [ ] **Step 5: Commit the wrapper**

```bash
git add src/components/manim
git commit -m "feat: add responsive manim scene lifecycle"
```

---

### Task 6: Implement the stable Linear Regression Scene controller

**Files:**
- Create: `src/components/visualizations/linear-regression/LinearRegressionSceneController.ts`

**Interfaces:**
- Consumes: `STUDY_DATA`, `DataPoint`, regression functions, and a live `Scene`.
- Produces:

```ts
export interface RegressionFrame {
  slope: number;
  intercept: number;
  mse: number;
}

export interface LinearRegressionSceneControllerOptions {
  points: readonly DataPoint[];
  initial: RegressionParameters;
  onFrame: (frame: RegressionFrame) => void;
}

export class LinearRegressionSceneController {
  static create(scene: Scene, options: LinearRegressionSceneControllerOptions): Promise<LinearRegressionSceneController>;
  setParameters(parameters: RegressionParameters): void;
  animateTo(parameters: RegressionParameters, duration: number): Promise<void>;
  dispose(): void;
}
```

- [ ] **Step 1: Build immutable plot structure**

Create `Axes` with x range `[0, 9, 1]`, y range `[45, 95, 10]`, x length `10.2`, y length `5.8`, no tips, muted axis color, and readable ticks. Add one `Dot` per dataset point, grouped separately from dynamic layers.

- [ ] **Step 2: Build stable dynamic objects**

Create slope and intercept `ValueTracker`s, one `FunctionGraph`, one residual `Line` per point, and one `MathTex({ latex: '\\hat{y}=wx+b' })`. Await `modelLabel.waitForRender()` before positioning and adding it. Use cobalt for the graph and coral with partial opacity for residuals.

- [ ] **Step 3: Implement one refresh path**

Private `refreshFromTrackers(notify = true)` reads trackers, calls `graph.setFunction(x => slope * x + intercept)`, updates each residual line in place through `line.setStart(observedPoint).setEnd(predictedPoint)`, renders through `scene.render()` when no render loop is active, and emits `{ slope, intercept, mse }`. `setParameters` sets both trackers then calls this refresh once.

- [ ] **Step 4: Implement manim-powered best-fit movement**

Attach one updater to a dedicated dynamic group so tracker changes refresh graph and residual geometry during animation. Run both tracker animations in one call:

```ts
await scene.play(
  slopeTracker.animateTo(parameters.slope, { duration, rateFunc: smooth }),
  interceptTracker.animateTo(parameters.intercept, { duration, rateFunc: smooth }),
);
```

Throttle `onFrame` to one callback per animation frame and commit one exact final refresh after the promise resolves. Use duration `0` when reduced motion is active and `1.1` seconds otherwise.

- [ ] **Step 5: Implement idempotent cleanup**

Remove the dynamic updater, clear references/callbacks, and call `scene.clear({ render: false })` once. Do not call `scene.dispose()` because the wrapper owns it.

- [ ] **Step 6: Verify against the installed API**

Run: `npm run check && npm run build`

Expected: no TypeScript mismatch with `Axes`, `FunctionGraph`, `Line`, `MathTex`, `ValueTracker`, `smooth`, or `Scene` APIs. Open the post through a temporary direct component mount only after Task 7; do not add a second demo page.

- [ ] **Step 7: Commit the controller**

```bash
git add src/components/visualizations/linear-regression/LinearRegressionSceneController.ts
git commit -m "feat: add manim regression scene controller"
```

---

### Task 7: Connect accessible React controls to the Manim controller

**Files:**
- Create: `src/components/controls/ParameterSlider.tsx`
- Create: `src/components/controls/FigureButton.tsx`
- Create: `src/components/visualizations/linear-regression/LinearRegressionDemo.tsx`
- Create: `src/components/visualizations/linear-regression/linear-regression.css`
- Modify: `src/content/posts/linear-regression.mdx`

**Interfaces:**
- Consumes: `ResponsiveManimScene`, scene controller, regression math, data, and design tokens.
- Produces: the `<LinearRegressionDemo />` React island with stable test IDs and accessible values.

- [ ] **Step 1: Build reusable controls**

`ParameterSlider` props are `id`, `label`, `value`, `min`, `max`, `step`, `disabled`, `onChange`, and optional `formatValue`. Render a native range input, a visible label, and `<output htmlFor={id}>`. `FigureButton` renders a native button with `variant: 'primary' | 'secondary'` and a pressed inset state.

- [ ] **Step 2: Implement React state ownership**

Initialize state from `INITIAL_PARAMETERS`; derive MSE with `useMemo`. Create the controller in a memoized Scene setup callback receiving `{ scene }` and dispose it through the returned cleanup. The controller `onFrame` updates slope/intercept during best-fit animation. Use `window.matchMedia('(prefers-reduced-motion: reduce)')` with listener cleanup.

- [ ] **Step 3: Connect slider and reset behavior**

Slope range is `2`–`8` with step `0.05`; intercept range is `35`–`60` with step `0.25`. Every input updates React and calls `controller.setParameters` with both current values. Reset restores `{ slope: 3.5, intercept: 52 }`. Disable both sliders and both buttons while animating.

- [ ] **Step 4: Connect Find Best Fit**

Calculate the target once with `calculateLeastSquares(STUDY_DATA)`. Use `try/finally` around `controller.animateTo(target, reducedMotion ? 0 : 1.1)`. On success set exact target values and announce `최적 직선에 도착했습니다` in a polite live region. On failure display an inline error and re-enable controls.

- [ ] **Step 5: Compose one coherent instrument panel**

Render one `<figure>` containing the plot, control rail, slope/intercept outputs to two decimals, MSE to three decimals, residual legend, Find Best Fit, Reset, status, and a caption explaining that the points are a teaching dataset. Add a labeled fit-quality meter: MSE at or below `0.35` is `최적 적합`, MSE at or below `5` is `가까워짐`, and larger values are `탐색 중`; color reinforces but does not replace the text. Include an accessible HTML equivalent of the Scene's `MathTex` model label. Use test IDs `slope-slider`, `intercept-slider`, `mse-value`, `fit-quality`, `best-fit-button`, `reset-button`, and `figure-status`.

- [ ] **Step 6: Mount the island in MDX**

Replace the explanatory loading callout with:

```mdx
import LinearRegressionDemo from '../../components/visualizations/linear-regression/LinearRegressionDemo';

<div className="wide-figure">
  <LinearRegressionDemo client:visible />
</div>
```

- [ ] **Step 7: Verify interaction manually**

Run: `npm run dev -- --host 127.0.0.1`

Expected: sliders move the line and residuals without creating another canvas; MSE changes; Best Fit animates to slope `5.20`, intercept `46.46`, and MSE `0.269`; Reset returns to slope `3.50` and intercept `52.00`.

- [ ] **Step 8: Commit the complete figure**

```bash
git add src/components/controls src/components/visualizations/linear-regression src/content/posts/linear-regression.mdx
git commit -m "feat: add interactive linear regression lesson"
```

---

### Task 8: Polish the complete article and responsive learning flow

**Files:**
- Modify: `src/content/posts/linear-regression.mdx`
- Modify: `src/layouts/PostLayout.astro`
- Modify: `src/styles/global.css`
- Modify: `src/components/visualizations/linear-regression/linear-regression.css`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: working figure and complete MDX content.
- Produces: final reading sequence and mobile/tablet/desktop presentation.

- [ ] **Step 1: Perform content continuity review**

Read the built article from top to bottom. Ensure every control is introduced before use, residuals are explained before MSE, least squares is explained after experimentation, and the closing section distinguishes prediction from causal inference. Remove duplicate explanations and generic filler.

- [ ] **Step 2: Refine wide-figure behavior**

At widths above 1100px, allow the figure to reach at most 1120px while prose stays at 720px. Below 860px, stack plot and controls. Below 520px, preserve page gutters of at least 16px, keep controls at least 44px high, retain full plot bounds, and prevent KaTeX or code from expanding the page.

- [ ] **Step 3: Refine states and keyboard flow**

Confirm focus order follows slope, intercept, Find Best Fit, Reset. Make disabled state readable, focus ring at least 2px, status well non-jumping, and residual/best-fit meanings distinguishable by labels and line style as well as color.

- [ ] **Step 4: Run static and unit verification**

Run: `npm run check && npm test && npm run build`

Expected: all pass; no horizontal overflow at 390px, 768px, or 1440px during manual inspection.

- [ ] **Step 5: Commit the learning-flow polish**

```bash
git add src/content src/layouts src/styles src/components/visualizations src/pages/index.astro
git commit -m "feat: polish responsive learning experience"
```

---

### Task 9: Add browser coverage and audit motion

**Files:**
- Create: `tests/blog.spec.ts`
- Create: `tests/linear-regression.spec.ts`
- Modify: `playwright.config.ts`
- Modify: animation and CSS files only when the audit identifies a concrete issue.

**Interfaces:**
- Consumes: deployed-equivalent local site and accessible test IDs.
- Produces: repeatable navigation, interaction, responsive, reload, and reduced-motion evidence.

- [ ] **Step 1: Write failing blog browser tests**

Test Home → post navigation, `/posts/linear-regression/` direct load, reload, seven section headings, code/inline code, and `.katex`. Run against desktop Chromium.

- [ ] **Step 2: Write failing interaction tests**

Set slope to `6`, assert slope output and MSE change; set intercept to `44`, assert another MSE change; click Best Fit, wait for idle status, and assert `5.20`, `46.46`, `0.269`; click Reset and assert `3.50`, `52.00`. Assert one canvas exists after reload and history navigation.

- [ ] **Step 3: Add responsive and reduced-motion tests**

Use viewports 390×844, 768×1024, and 1440×1000. Assert `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, plot and controls are visible, and slider bounding boxes are at least 44px high including their label/control row. Emulate reduced motion, click Best Fit, and assert completion in under 400ms with the same final values.

- [ ] **Step 4: Run tests and capture initial failures**

Run: `npx playwright install chromium && npm run test:e2e`

Expected before fixes: any selector, layout, or lifecycle mismatch is reported with trace and screenshot rather than silently skipped.

- [ ] **Step 5: Fix only evidenced test failures**

Adjust implementation or selectors so tests measure user-visible behavior. Do not remove assertions or replace visual state checks with fixed timeouts. Use role/name selectors where practical and test IDs only for numeric instruments.

- [ ] **Step 6: Read and apply the animation review skill**

The main agent reads `review-animations/SKILL.md` completely and audits best-fit interpolation, button/slider feedback, reduced motion, interruption policy, and any entry transitions. Apply only concrete fixes permitted by that read-only audit by returning to the appropriate implementation task context; retain the audit findings for the handoff.

- [ ] **Step 7: Run the full verification matrix**

Run: `npm run check && npm test && npm run build && npm run test:e2e`

Expected: all commands exit 0 with no skipped milestone tests.

- [ ] **Step 8: Commit browser validation and motion fixes**

```bash
git add tests playwright.config.ts src
git commit -m "test: verify learning blog interactions"
```

---

### Task 10: Configure GitHub Pages and document the system

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: passing check/test/build/e2e commands and `dist/` output.
- Produces: automatic root Pages deployment and author/developer handoff.

- [ ] **Step 1: Add the Pages workflow**

Trigger on pushes to `main` and `workflow_dispatch`. Grant `contents: read`, `pages: write`, and `id-token: write`. Use one concurrency group named `pages`. The build job checks out, sets up Node 24 with npm caching, runs `npm ci`, `npm run check`, `npm test`, `npm run build`, configures Pages, and uploads `dist/`. The deploy job uses the `github-pages` environment and `actions/deploy-pages`.

- [ ] **Step 2: Document local use and post authoring**

README commands are `npm ci`, `npm run dev`, `npm run check`, `npm test`, `npm run build`, and `npm run test:e2e`. Explain frontmatter fields, creating an MDX post, importing a React visualization with `client:visible`, root versus project `DEPLOY_BASE`, and selecting GitHub Actions as the Pages source.

- [ ] **Step 3: Add the required manim findings**

Document the confirmed findings, updating wording only if fresh implementation evidence disproves one:

```text
manim-web findings

- 잘 동작한 기능: Scene, Axes, FunctionGraph, MathTex, ValueTracker, animation, resize, dispose
- 제약이 있었던 기능: fixed-size ManimScene defaults, independent interaction-handle cleanup, non-cancellation-safe play promise
- 사용한 workaround: custom responsive wrapper, controller-owned cleanup, disabled controls during play
- 향후 library contribution 후보: responsive React component defaults and cancellation-safe playback
```

- [ ] **Step 4: Verify the workflow and clean tree locally**

Run: `npm ci && npm run check && npm test && npm run build && npm run test:e2e && git status --short`

Expected: all commands pass and status lists only the workflow and README before commit.

- [ ] **Step 5: Commit deployment and documentation**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: deploy interactive notes to pages"
```

- [ ] **Step 6: Perform completion verification before handoff**

Invoke `superpowers:verification-before-completion`, rerun its required fresh checks, inspect the built site in a real browser at desktop/tablet/mobile sizes, and report the exact commands and results. Do not claim the public URL is deployed until the workflow has run successfully after a push; report local Pages readiness separately from live deployment state.
