# Interactive learning blog design

## Goal

Build a personal, static learning notebook at `https://sorbetsharkroundhand.github.io/` for studying statistics, machine learning, deep learning, artificial intelligence, visualization, and mathematics. Posts are authored in MDX and can embed interactive mathematical scenes. The first milestone is a substantive Korean article, **Linear Regression — 선형회귀를 눈으로 이해하기**, with a working regression playground powered by `manim-web`.

The project is a learning environment rather than a conventional chronological blog or developer portfolio. Reading, mathematical notation, and direct manipulation of visual models are the primary experience.

## Existing repository transition

The repository currently contains an unrelated design document and a `3b1b/manim` Python submodule. They belong to an earlier “Manim project showcase” direction and will be removed during implementation:

- `.gitmodules`
- `third_party/manim`
- `docs/superpowers/specs/2026-08-09-manim-inspired-github-pages-design.md`

The new application will use the published `manim-web@0.3.24` npm dependency. It will not fork or vendor `manim-web` unless implementation uncovers a blocker that cannot be solved through its public API. Any such blocker must be documented before a minimal library patch is considered.

## Selected technical approach

Use Astro as the static site and content layer, with React islands for interactive visualizations:

- Astro and TypeScript for static pages, layouts, routing, metadata, and build output
- `@astrojs/mdx` for posts
- `@astrojs/react` for interactive visualization islands
- React for visualization controls and UI state
- `manim-web@0.3.24` for scenes, axes, graphs, mobjects, interactions, and animations
- `remark-math`, `rehype-katex`, and KaTeX CSS through Astro Markdown processing for article equations
- `manim-web` `MathTex` only for equations that must exist inside a Scene
- plain CSS with project-owned tokens and component styles; no Tailwind dependency
- Vitest for calculations and controller-level tests
- Playwright for navigation, interaction, reload, and responsive browser tests
- GitHub Actions and GitHub Pages for deployment

Astro is preferred over a client-only React router because it emits a real HTML file for every post. Direct navigation and refresh therefore work on GitHub Pages without hash URLs or a custom 404 redirect. React remains the correct boundary for the interactive elements, while non-interactive pages do not download the `manim-web`, Three.js, or MathJax client bundles.

The repository is the user-site repository `sorbetsharkroundhand/sorbetsharkroundhand.github.io`, so production uses the root base path `/`. Configuration will keep the site URL and base path explicit, with a documented single-setting change for a future project-site deployment under `/repository-name/`.

## Information architecture

### Home

The home page immediately identifies the site as an interactive study notebook:

```text
Interactive Notes

Statistics · Machine Learning · AI · Mathematics

Things I learned,
visualized.
```

It includes:

- a concise introduction
- topic links for Statistics, Machine Learning, Deep Learning, Mathematics, and Visualization
- a recent-post section generated from the content collection
- one prominent link to the Linear Regression post
- restrained laboratory-note visual details rather than portfolio metrics or SaaS dashboard widgets

### Posts and topics

The posts index lists content from an Astro content collection and supports category filtering through static links/query-independent category pages. The initial implementation does not add client-side search or a CMS.

Each post frontmatter contains:

- `title`
- `description`
- `publishedAt`
- `updatedAt` when applicable
- `category`
- `topics`
- `draft`
- `wideFigures`, defaulting to `false`

The content schema validates these values at build time. New posts are added by creating an `.mdx` file and importing only the visualization components that the article needs.

### Post page

Post pages provide a narrow reading column with headings, paragraphs, lists, quotes, images, syntax-highlighted code, inline code, and KaTeX equations. Interactive figures can break out to a wider width while the surrounding prose remains readable. Headings receive stable anchors. A compact article header shows category, title, summary, and publication date.

## Project boundaries and modules

The intended source structure is:

```text
src/
  components/
    article/
      EquationNote.astro
      InteractiveFigure.astro
    controls/
      ParameterSlider.tsx
      FigureButton.tsx
    manim/
      ResponsiveManimScene.tsx
      ManimErrorBoundary.tsx
    navigation/
      SiteHeader.astro
      SiteFooter.astro
    visualizations/
      linear-regression/
        LinearRegressionDemo.tsx
        LinearRegressionSceneController.ts
        regressionMath.ts
        regressionData.ts
  content/
    posts/
      linear-regression.mdx
  layouts/
    BaseLayout.astro
    PostLayout.astro
  pages/
    index.astro
    posts/index.astro
    posts/[...slug].astro
    topics/[topic].astro
  styles/
    global.css
    tokens.css
  content.config.ts
```

Implementation follows this structure unless an installed Astro API requires a framework-owned filename such as `content.config.ts`. The responsibility boundaries remain:

- Astro components own static structure, metadata, content listings, and article chrome.
- React components own controls and stateful interaction.
- `ResponsiveManimScene` owns one Scene lifecycle and exposes a stable ready callback.
- A scene controller owns manim mobjects and imperative visualization updates.
- Pure math modules own least-squares and MSE calculations and have no DOM or rendering dependency.
- MDX owns educational prose and chooses where a visualization appears.

## Design system

The visual direction is a calm, tactile laboratory notebook with selective neumorphism.

### Color and surfaces

- off-white paper background with a slightly cooler secondary canvas surface
- dark graphite text with WCAG-readable contrast
- muted cobalt or blue-violet as the main mathematical accent
- warm coral for residual/error marks
- green used sparingly for the best-fit state
- shadows limited to major floating surfaces and tactile controls
- inset shadows limited to slider tracks, compact status wells, and pressed states

The visualization surface is one coherent instrument panel, not a collection of nested cards. Borders and tonal changes do most of the separation work. Gradients are used only when a subtle physical-light cue materially improves depth.

### Typography

- a local-first editorial serif stack for the home title and article title
- a local-first Korean/Latin sans-serif stack for prose and controls
- a local-first monospace stack for code and numerical readouts
- generous line height and a reading width of approximately 68–72 characters
- tabular numerals for slope, intercept, and MSE values

The first milestone makes no remote font requests. CSS system stacks preserve Korean legibility and keep the GitHub Pages build self-contained.

### Motion and accessibility

Motion communicates state changes: line fitting, control press, focus, and figure entry. There is no continuous decorative animation. The site respects `prefers-reduced-motion`; under reduced motion, best-fit moves immediately or with a very short crossfade while all values remain understandable.

All HTML controls are keyboard accessible, use visible focus rings, expose labels and values, and do not rely on shadow or color alone. Canvas content is accompanied by a textual figure caption, live numerical values, and an accessible explanation of the current model quality.

## Linear Regression article

The Korean article is written as real learning material and follows this sequence:

1. **데이터에서 직선 찾기** — study-hours and exam-score data, scatter plot, and the intuitive fitting question.
2. **선형 모델** — `\hat{y}=wx+b`, with clear definitions of slope, intercept, and prediction.
3. **직접 움직여보기** — slope and intercept sliders with live values.
4. **Residual Visualization** — vertical residual lines connecting each observation to its prediction.
5. **Mean Squared Error** — the MSE equation, live value, and interpretation.
6. **Find Best Fit** — an animated move from the current parameters to the least-squares solution.
7. **정리** — why least squares selects this line and what the visualization does not imply about causality.

The page introduces concepts before controls and follows the figure with interpretation, so the visualization supports the lesson rather than interrupting it.

## Regression visualization behavior

### Dataset and model

Use a small fixed dataset representing study hours and exam scores. Values are chosen so the relationship is visible but not perfectly linear. The dataset is deterministic, exported from `regressionData.ts`, and shared by calculations and tests.

Pure functions provide:

- `predict(x, slope, intercept)`
- `calculateResiduals(points, slope, intercept)`
- `calculateMSE(points, slope, intercept)`
- `calculateLeastSquares(points)`

Least squares uses the closed-form slope and intercept formulas. Tests compare the result with known expected values and verify that its MSE is no greater than nearby parameter choices.

### State ownership

React is the source of truth for user-facing state:

- current slope
- current intercept
- current MSE
- idle/animating/best-fit status
- reduced-motion preference

The scene controller keeps matching `ValueTracker` values and stable manim mobject references. It does not create a new Scene or a new React tree when parameters change.

For slider input:

1. React updates slope or intercept.
2. The demo calls `controller.setParameters(slope, intercept)`.
3. The controller updates the existing regression graph, residual lines, and trackers.
4. The controller renders one frame.
5. React derives and displays the new MSE from the pure calculation module.

For **Find best fit**:

1. React disables conflicting controls and marks the figure as animating.
2. The controller calls `scene.play()` with the slope and intercept `ValueTracker.animateTo()` animations in parallel.
3. A manim updater redraws the line and residuals from tracker values on each animation frame.
4. The controller reports intermediate parameters to React at a throttled rate for numerical readouts.
5. The final exact least-squares values are committed to React when animation resolves.
6. The figure announces the optimal slope, intercept, and MSE in an accessible status region.

Slope, intercept, Find Best Fit, and Reset controls are disabled during the brief best-fit animation because `manim-web` does not expose a cancellation-safe `Scene.play()` promise. Once idle, Reset restores the documented initial parameters and updates all visuals. Repeated best-fit and reset operations are idempotent.

### Manim objects

The Scene contains:

- `Axes` configured for the dataset range
- axis labels
- one `Dot` per observation
- one `FunctionGraph` for `y = wx + b`
- one residual `Line` per observation
- a `MathTex` model label showing `\hat{y}=wx+b` inside the plot
- two `ValueTracker` instances used for best-fit animation

Article equations remain HTML/KaTeX. The Scene's `MathTex` model label validates vector LaTeX rendering and is paired with an equivalent accessible HTML label. It scales with the plot and remains inside the visible camera frame at every supported viewport.

The first milestone does not require dragging data points, step-forward controls, or arbitrary dataset editing. The wrapper and controller interfaces should allow those additions in future visualizations.

## Scene lifecycle and multiple-scene safety

`ResponsiveManimScene` renders a container with a stable aspect ratio and creates a `Scene` without fixed pixel dimensions so `manim-web` auto-resize can observe the container. It records every interaction handle returned by `makeDraggable`, `makeClickable`, or `makeHoverable`.

Cleanup order on unmount is:

1. cancel controller-owned asynchronous work and callbacks
2. dispose interaction handles
3. clear controller references
4. call `scene.dispose()`

The component must tolerate React development-mode setup/cleanup repetition without leaking canvases, listeners, animation frames, or WebGL contexts.

Visualization islands use `client:visible` so the browser downloads and initializes `manim-web` only near the viewport. Each visualization has its own Scene and controller. A static fallback caption and loading state occupy the same aspect ratio to avoid layout shift. The initial milestone has one Scene. Future posts must use the same lazy initialization and disposal wrapper so WebGL contexts do not accumulate through navigation or remounting.

## Responsive layout

The visualization uses a stable wide aspect ratio on desktop and tablet. Controls appear beside the plot only when enough width remains for both; otherwise they move below it. On mobile:

- the figure reaches the safe viewport width
- the Scene keeps its complete coordinate frame instead of clipping
- controls have touch-sized targets
- slider labels and values stay visible without horizontal scrolling
- wide article figures escape the prose column but retain page gutters

The scene changes canvas resolution and camera aspect ratio through `Scene.resize`; it does not scale a fixed bitmap with CSS.

## Error handling

- Content schema errors fail the build with a clear message.
- A React error boundary replaces a failed visualization with an explanatory fallback while preserving the article.
- Scene initialization and `MathTex` rendering errors are surfaced in the figure rather than leaving a blank panel.
- Animation promises use `try/finally` so controls are re-enabled after errors or cancellation.
- Unsupported WebGL displays a readable fallback explaining that the article remains available.
- Calculations reject an empty dataset and handle the zero-variance-x case with a descriptive error.

No remote runtime API is required. Once deployed, the site remains functional as static files.

## GitHub Pages deployment

Astro builds to `dist/`. The production configuration sets:

- `site: 'https://sorbetsharkroundhand.github.io'`
- no project `base`, because this is the `<username>.github.io` repository

The Astro configuration reads `DEPLOY_BASE`, defaulting to `/`; a future project repository sets it to `/repository-name/`. Internal links and asset references use `import.meta.env.BASE_URL` or Astro-generated URLs rather than hard-coded repository paths.

The GitHub Actions workflow:

1. checks out `main`
2. installs the committed npm lockfile with `npm ci`
3. runs type checks and tests
4. runs `npm run build`
5. uploads `dist/` as a Pages artifact
6. deploys through the GitHub Pages environment

The workflow also supports manual dispatch. The repository’s Pages source must be set to GitHub Actions.

## Verification strategy

### Automated checks

- TypeScript/Astro checking succeeds with no errors.
- Vitest validates prediction, residual, MSE, and least-squares functions.
- The production build completes.
- Playwright verifies Home → Linear Regression navigation, direct post loading, reload, MDX elements, and rendered KaTeX.
- Playwright changes both sliders and verifies that the displayed values and MSE change.
- Playwright invokes Find best fit and verifies final parameters and MSE against the pure calculation result.
- Playwright verifies Reset after both manual changes and best-fit animation.
- Playwright checks representative mobile, tablet, and desktop viewports for overflow and usable controls.
- A reduced-motion test verifies the figure reaches the same final result without a long animation.

Where WebGL assertions are unreliable in headless CI, interaction tests assert the accessible numeric state and controller behavior, while local browser verification confirms the rendered line and residual movement.

### Manual visual QA

Inspect the home page and article at mobile, tablet, and desktop widths. Confirm typography, contrast, focus states, canvas sharpness, plot labels, slider touch behavior, residual visibility, loading/error fallbacks, and reduced motion. Test repeated navigation to ensure only one canvas and one set of event listeners exist for the figure.

## Completion criteria

The first milestone is complete when a visitor can open the deployed GitHub Pages site, navigate to the Linear Regression article, understand the lesson, adjust slope and intercept, see the line and residuals respond, observe the MSE change, animate to the verified least-squares solution, reset the experiment, reload the post directly, and repeat the experience on mobile without clipping or broken controls.

The final handoff includes:

- the deployed-site configuration and local run instructions
- instructions for adding a new MDX post and visualization
- verification results
- a `manim-web findings` section listing successful APIs, constraints, workarounds, and possible upstream contribution candidates

## Explicitly deferred work

- accounts, comments, analytics, search, CMS, or server-side data
- editing datasets in the first visualization
- implementing every generic playback control before a visualization needs it
- forking `manim-web`
- custom-domain setup
- 3D scenes
- broad refactoring unrelated to this milestone
