# ASCII Brutalism Interactive Learning Notes Design

## Status and source

This document is the approved design for GitHub issue #2, **“feat: ASCII Brutalism 기반 인터랙티브 학습 노트로 재설계.”** It replaces the authoring and visual-design decisions in the 2026-08-09 design while preserving the working static-site, accessibility, and `manim-web` lifecycle foundations delivered by pull request #1.

The implementation target is `sorbetsharkroundhand/sorbetsharkroundhand.github.io`, deployed as a GitHub Pages user site at the root base path `/`.

## Goal

Turn the existing Astro learning blog into a black-and-white interactive learning notebook whose identity comes from large, curated ASCII art and restrained ASCII Brutalism. Authors write ordinary Markdown. The site supplies layout, ASCII art, and registered interactive figures automatically.

The finished experience must feel like a mathematical notebook that can be manipulated, not a portfolio, dashboard, generic dark blog, hacker terminal, Matrix interface, or cyberpunk demo.

## Non-goals

- CMS, accounts, comments, search, or client-side filtering
- Author-written ASCII art inside post Markdown
- React, TSX, MDX imports, hydration directives, relative component paths, or layout wrappers in post content
- Automatic AI generation of ASCII art at build time
- Green terminal styling, CRT noise, scan lines, or glitch effects
- Replacing `manim-web` or rewriting the proven scene lifecycle without a demonstrated need

## Approved experience principles

1. **Content and presentation are separate.** Markdown owns educational prose. Visualization modules own mathematical behavior. The ASCII system owns visual identity and page chrome.
2. **Authoring is Markdown-only.** Adding a post never requires editing React or Astro component syntax inside the post.
3. **Registration is explicit and validated.** Visualization placement is configured in TypeScript by post slug and exact heading, then checked during the build.
4. **Color communicates focus.** The interface is monochrome. Each visualization scene has at most one active accent color.
5. **Static reading comes first.** Every post, explanation, fallback, and navigation path works as static HTML. Interactive code is loaded only near the viewport.
6. **ASCII is a system, not decoration.** It appears in the home hero, post identity, loading states, side rails, index labels, 404 page, and footer without reducing prose readability.

## Execution constraint

Issue #2 is implemented directly in the current Codex task. No subagents are created or used for planning, implementation, review, debugging, or verification. Work proceeds sequentially with explicit checkpoints in the dedicated worktree.

## Information architecture

### Home

The home page contains:

- a large site-level ASCII hero with a concise statement of purpose
- mechanical labels such as `00::INDEX` and `[OPEN ARCHIVE →]`
- up to four most recently published posts
- a full-row link for every post with a visible `[READ NOTE →]` affordance
- the existing static subject navigation
- a useful one-post and zero-post state so the layout never assumes four posts exist

The recent-post list is generated from the content collection and sorted by `publishedAt` descending. It displays at most four entries.

### Posts index

The posts index is a ruled list, not a card grid. Each row exposes:

- zero-padded sequence number
- category
- title and subtitle
- publication date
- topic links
- `[READ NOTE →]`

The post URL is the primary full-row action. Its anchor uses a stretched pseudo-element rather than wrapping other anchors. Topic links are positioned above that hit area, remain valid independent actions, and must not trigger post navigation. Keyboard focus makes the same action and accent state visible as pointer hover.

### Post detail

The post page contains:

- a back link to the archive
- slug-specific ASCII art, with category fallback
- category, title, subtitle, publication date, and topic links
- a readable prose column
- automatically inserted interactive figures
- previous and next published-post navigation ordered by publication date; “previous” means the next older note and “next” means the next newer note

The prose column remains approximately 68–72 characters wide. Interactive figures may break out to the wider layout without requiring a post-level `wideFigures` setting.

### Topic pages

Topic pages retain static routes and adopt the same ruled post-row component used by the home and archive. Empty topics show a deliberate text state rather than a blank list.

### 404

`src/pages/404.astro` uses a dedicated ASCII composition, explains that the coordinate is unregistered, and links to the home page and posts archive. It remains useful without JavaScript.

## Content model and Markdown-only authoring

Posts live in `src/content/posts/` as `.md` files. The content loader glob is `**/*.md`; committed `.mdx` posts fail the separate authoring-policy test instead of silently disappearing from the collection.

The frontmatter schema is:

```yaml
---
title: Linear Regression
subtitle: 선형회귀를 눈으로 이해하기
description: 직선을 움직이며 예측, 잔차, 평균제곱오차를 연결합니다.
publishedAt: 2026-08-15
updatedAt: 2026-08-16
category: Statistics
topics:
  - linear-regression
  - least-squares
draft: false
---
```

Required fields are `title`, `subtitle`, `description`, `publishedAt`, `category`, `topics`, and `draft`. `updatedAt` is optional. `wideFigures` is removed because figure width belongs to the layout system.

The existing `linear-regression.mdx` becomes `linear-regression.md`. Its prose, equations, headings, educational caveat, and code example are preserved. The component import, `client:visible`, and `.wide-figure` wrapper are removed.

README authoring instructions show only frontmatter, Markdown, math, and heading conventions. They do not mention React, TSX, MDX, hydration directives, relative component paths, scene cleanup, or visualization CSS.

## Visualization registration architecture

### Source structure

```text
src/
  integrations/
    visualization-slots.ts
  visualizations/
    manifest.ts
    manifest.test.ts
    client-registry.ts
    mount-visualizations.ts
    mount-visualizations.test.ts
    linear-regression/
      LineModelDemo.tsx
      ResidualDemo.tsx
      BestFitDemo.tsx
      LinearRegressionSceneController.ts
      regressionData.ts
      regressionMath.ts
      linear-regression.css
```

`manifest.ts` is pure metadata and is safe to load during the Astro build. It does not import React, `react-dom`, `manim-web`, or visualization components.

The manifest shape is:

```ts
export type AccentName = 'cyan' | 'red' | 'yellow' | 'violet';

export interface VisualizationPlacement {
  id: string;
  afterHeading: string;
  accent: AccentName;
  title: string;
  description: string;
}

export const postVisualizations: Record<string, readonly VisualizationPlacement[]>;
```

`client-registry.ts` maps the same IDs to dynamic imports. It is the only central module that knows which React component implements an ID.

```ts
export const visualizationLoaders = {
  'linear-regression:model': () => import('./linear-regression/LineModelDemo'),
  'linear-regression:residuals': () => import('./linear-regression/ResidualDemo'),
  'linear-regression:best-fit': () => import('./linear-regression/BestFitDemo'),
} as const;
```

### Build-time insertion

`visualization-slots.ts` participates in Astro's Markdown processing. For the current post slug it:

1. reads the post's heading nodes in source order
2. compares normalized visible heading text with `afterHeading`
3. inserts a static visualization mount element immediately after the complete section heading
4. includes the registered ID, accent token, accessible title, description, ASCII loading placeholder, and no-script explanation

The inserted HTML is meaningful before hydration. It never inserts a blank client-only box.

The integration emits a build error with the post slug, visualization ID, and expected heading when:

- a manifest post slug does not correspond to a published or draft Markdown source file
- an `afterHeading` value has no exact match
- the same visible heading occurs more than once in a post
- two placements target the same post and heading
- a manifest ID is absent from `visualizationLoaders`
- a client loader exists without manifest metadata

Validation runs from `npm run check`, unit tests, and `npm run build`; it is not limited to a test that developers may skip.

`astro.config.ts` removes the MDX integration and configures `markdown.processor` with `unified()` from `@astrojs/markdown-remark`. The unified pipeline contains `remark-math`, the visualization-slot plugin, and `rehype-katex`. `@astrojs/markdown-remark` becomes a direct dependency. This also replaces the deprecated `markdown.remarkPlugins` and `markdown.rehypePlugins` configuration used by the baseline.

### Client mounting and cleanup

One small browser entry point discovers visualization mount elements. An `IntersectionObserver` begins loading when a slot approaches the viewport. Each slot is mounted at most once per document lifecycle.

For a visible slot, the client:

1. resolves the ID in `visualizationLoaders`
2. dynamically imports only that visualization chunk
3. creates one React root inside the mount element
4. renders the registered demo through the existing error boundary and responsive scene wrapper
5. removes the loading status after the scene is ready

The client stores the observer, React root, and scene-owned cleanup handle per mount. Page teardown disconnects the observer and unmounts every React root. The existing controller remains responsible for `manim-web` mobjects, event handles, animations, and `Scene.dispose()`.

Import or setup failures retain the static description, show an accessible error message, and expose a retry button. Retrying creates a fresh loader attempt without duplicating canvases or observers.

## Linear regression learning sequence

The existing all-in-one demo is decomposed into three registered scenes that share the deterministic dataset, pure regression math, responsive scene wrapper, and controller primitives.

### Line model scene

- inserted after `직접 움직여보기`
- slope and intercept controls
- observations and axes remain white or gray
- the regression line is the only cyan element
- reduced motion does not affect direct slider updates

### Residual scene

- inserted after `Residual Visualization`
- slope and intercept controls remain available for exploration
- observations, axes, and model line are white or gray
- residual segments are the only red elements
- accessible text reports the current residual interpretation and MSE

### Best-fit scene

- inserted after `Find Best Fit`
- current parameters, best-fit action, reset action, and MSE
- inactive geometry stays white or gray
- the current optimization point or best-fit target is the only yellow element
- `prefers-reduced-motion` commits the exact final parameters immediately
- conflicting controls remain disabled while a cancellable state transition is not available

The split is a presentation change, not three separate calculation implementations. Regression data and math remain single-source modules. Controller helpers are shared where their behavior is identical; scene-specific orchestration stays in each demo.

## ASCII design system

### Registry and fallback

```text
src/design/ascii/
  types.ts
  registry.ts
  validate-ascii.ts
  category-defaults.ts
  site-hero.ts
  not-found.ts
  linear-regression.ts
```

Every art entry provides:

- `label`: accessible description
- `desktop`: curated fixed-width lines
- `mobile`: a shorter curated alternative
- `thumbnail`: a compact list-row alternative

Resolution order is:

1. exact post slug
2. category default
3. neutral notebook fallback

ASCII selection never occurs inside post Markdown. Art is rendered with preserved whitespace, hidden decorative glyph runs, and a nearby readable label. It is not read character-by-character by assistive technology.

Validation rejects empty variants, inconsistent line widths inside a variant, desktop lines wider than the documented maximum, and entries without an accessible label. Mobile art is selected with CSS rather than client JavaScript.

### Visual language

- background: near-black
- primary text: white
- secondary text: neutral gray
- borders and grids: dark gray, 1px, square corners
- shadows: none except browser-native focus contrast when needed
- body typography: local-first Korean/Latin sans-serif stack
- chrome, labels, metadata, and ASCII: local-first monospace stack
- no remote font requests
- no rounded cards or pill-shaped containers
- asymmetric grids on wide screens, single-column reading flow on narrow screens
- mechanical labels such as `01::OBSERVATION`, `[READ NOTE →]`, `[LOAD FAILED]`

Color tokens exist only for the approved scene accents: cyan, red, yellow, and violet. A page may contain several lazy scenes, but an individual scene exposes only its registered accent. Normal navigation hover and focus may borrow the post's accent while all idle navigation remains monochrome.

Desktop pages use restrained side rails and coordinate/index marks. At mobile widths those rails collapse into horizontal rules or short labels; they never reduce the prose below a comfortable reading width or introduce page-level horizontal scrolling.

## Shared page components

The redesign introduces focused, reusable Astro components:

- `AsciiArt.astro`: selects and renders accessible responsive art variants
- `PostRow.astro`: one consistent full-row post link with independent topic links
- `MechanicalLabel.astro`: numbered chrome labels
- `VisualizationSlot` markup emitted by the Markdown integration
- `PostPager.astro`: previous/next navigation

`BaseLayout.astro` retains metadata, the skip link, header, main landmark, and footer. It changes the theme color to near-black and applies the new chrome. `PostLayout.astro` receives the complete post entry plus adjacent posts so it can resolve ASCII art and navigation without global client state.

## Accessibility

- All routes and core content remain static HTML.
- Skip navigation remains the first focusable element and becomes visibly placed on focus.
- Full-row post interactions use a real anchor and preserve valid independent topic links.
- All pointer hover states have matching `:focus-visible` states.
- Focus indicators meet contrast requirements and are not communicated by color alone.
- Interactive controls retain native keyboard behavior, visible labels, and live values.
- Canvas scenes have registered text descriptions and numerical equivalents.
- Loading uses polite status announcements; failures use an alert and keep the prose readable.
- ASCII glyph runs are hidden from screen readers; concise labels convey their meaning.
- `prefers-reduced-motion` removes decorative transitions and preserves immediate, deterministic scene state changes.

## Performance

- Astro emits a static HTML page for every published post, topic, index, and 404 route.
- Home, archive, topic, and posts without registered scenes ship no `manim-web` chunk.
- Each visualization uses a dynamic import and initializes only near the viewport.
- Multiple scenes on one post do not initialize together unless they independently approach the viewport.
- Scene teardown and React unmounting prevent duplicate canvases during reload, history restoration, and retry.
- ASCII art is source text and CSS; it adds no image request.
- Existing GitHub Pages base-path handling remains intact.

The build may continue to warn about a large `manim-web` visualization chunk, but static pages must not eagerly download it. Bundle behavior is verified in browser tests rather than inferred from chunk names alone.

## Testing strategy

### Unit and integration tests

- content schema accepts valid `.md` posts and rejects missing required fields
- repository authoring policy finds no `.mdx` post, component import, hydration directive, or wide-figure wrapper
- manifest validation accepts all three linear-regression placements
- missing slug, missing heading, duplicate heading, duplicate placement, and loader mismatch each produce a precise failure
- ASCII resolver follows slug → category → neutral fallback order
- ASCII validator enforces label and width rules
- mount lifecycle loads near the viewport, mounts once, retries cleanly, disconnects observers, and unmounts roots
- existing regression math and controller tests remain green after decomposition

### Playwright tests

- home exposes up to four real post paths and full-row `[READ NOTE →]` actions
- archive and topic rows support pointer and keyboard navigation without breaking topic links
- direct post navigation and reload render the Markdown article
- all three registered scenes appear after their exact headings
- a below-the-fold scene has no canvas before approaching the viewport and exactly one afterward
- failure fallback and retry are keyboard accessible
- previous and next links resolve correctly for first, middle, and last positions using test fixtures or focused unit coverage when only one production post exists
- 390px, 768px, and 1440px viewports have no page-level horizontal overflow
- reduced motion reaches the exact best-fit state without animation
- reload and browser history restoration never duplicate canvases
- 404 provides working home and archive links

### Required verification

Before completion, run serially:

```bash
npm run check
npm test
npm run build
npm run test:e2e
```

The Astro check and build commands must not run concurrently because both write `.astro` content artifacts.

## Migration and rollout

Implementation proceeds in independently verifiable stages on branch `codex/issue-2-ascii-brutalism`:

1. establish Markdown-only schema and migrate the existing post without changing its rendered educational content
2. add manifest validation and static heading-slot insertion
3. add client lazy mounting, failure handling, and cleanup
4. split and register the three regression scenes while preserving shared math and lifecycle behavior
5. add the ASCII registry and shared page components
6. redesign home, archive, topic, post detail, navigation, footer, and 404
7. update documentation and run the complete verification suite

Each stage starts with a failing focused test, implements the smallest coherent behavior, passes relevant tests, and creates a reviewable commit. The stages are executed inline and sequentially without subagent dispatch. Deployment remains the existing GitHub Pages workflow after all checks pass.

The former `third_party/manim/` checkout left in the primary working directory is outside this branch and must not be deleted or committed as part of issue #2.

## Acceptance mapping

- Markdown-only authoring: content schema, migration, README, and authoring-policy tests
- no React/MDX syntax in posts: `.md` enforcement and repository scan
- slug/heading insertion: pure manifest plus build-time Markdown integration
- invalid registration detection: mandatory validation in check and build paths
- automatic ASCII: registry resolution outside content
- consistent redesign: shared Astro page components and tokens
- monochrome plus one scene accent: global token constraints and scene-specific CSS
- real post paths and affordance: shared `PostRow`
- responsive readability: ASCII variants, collapsed rails, and three viewport tests
- lazy initialization, fallback, and cleanup: mount lifecycle plus existing responsive scene ownership
- complete verification: serial check, unit, build, and Playwright commands
