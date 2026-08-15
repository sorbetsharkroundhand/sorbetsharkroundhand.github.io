# ASCII Brutalism Learning Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Subagents are prohibited for this project; execute every task inline and sequentially.

**Goal:** Rebuild the existing Astro learning blog as a Markdown-only, black-and-white ASCII Brutalism notebook with build-validated heading-based visualization insertion and lazy `manim-web` scenes.

**Architecture:** Astro continues to emit static pages. A pure visualization manifest and Astro integration validate post slugs/headings at config time, while a rehype plugin inserts accessible static mount slots. A small browser controller observes those slots and dynamically imports React/Manim scenes only near the viewport. ASCII art and post-row presentation live in reusable Astro components outside post content.

**Tech Stack:** Astro 7.2, TypeScript 6, React 19, `manim-web` 0.3.24, `@astrojs/markdown-remark` unified processor, KaTeX, Vitest, Testing Library, Playwright, plain CSS.

## Global Constraints

- Do not create or use subagents.
- Work only in `.worktrees/issue-2-ascii-brutalism` on `codex/issue-2-ascii-brutalism`.
- Post sources are ordinary `.md`; post Markdown contains no React imports, JSX, `client:*`, or layout wrappers.
- The UI is black, white, and gray; each visualization scene exposes one accent color.
- Do not add green terminal, Matrix, CRT, scan-line, glitch, rounded-card, or decorative shadow styling.
- Preserve static routes, GitHub Pages base-path handling, keyboard access, visible focus, reduced motion, fallback text, lazy scene initialization, and cleanup.
- Run Astro check and build serially because both write `.astro` artifacts.
- Preserve the untracked `third_party/manim/` directory in the primary checkout; never add or delete it.

---

### Task 1: Markdown-only content pipeline

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `astro.config.ts`
- Modify: `src/content.config.ts`
- Rename: `src/content/posts/linear-regression.mdx` → `src/content/posts/linear-regression.md`
- Modify: `README.md`
- Create: `src/content/authoring-policy.test.ts`
- Modify: `src/layouts/PostLayout.astro`

**Interfaces:**
- Produces post data with required `subtitle: string` and no `wideFigures` field.
- Produces a `.md` post whose headings remain exactly `데이터에서 직선 찾기`, `선형 모델`, `직접 움직여보기`, `Residual Visualization`, `Mean Squared Error`, `Find Best Fit`, and `정리`.
- Produces Astro Markdown processing through `unified({ remarkPlugins, rehypePlugins })` without `@astrojs/mdx`.

- [x] **Step 1: Write the failing authoring-policy test**

```ts
expect(postFiles).toEqual(['linear-regression.md']);
expect(source).not.toMatch(/^(?:import|export)\s/m);
expect(source).not.toMatch(/<\/?[A-Z][^>]*>|client:|wide-figure|wideFigures/);
```

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/content/authoring-policy.test.ts`
Expected: FAIL because `linear-regression.mdx` contains an import, JSX wrapper, hydration directive, and `wideFigures`.

- [x] **Step 3: Replace MDX configuration and migrate the post**

```ts
markdown: {
  processor: unified({
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  }),
},
```

Remove `mdx()` and `@astrojs/mdx`, add direct `@astrojs/markdown-remark`, change the loader glob to `**/*.md`, require `subtitle`, remove `wideFigures`, rename the post, split its existing combined title into `title` and `subtitle`, and remove only the import/wrapper/island syntax from its body.

- [x] **Step 4: Update the post layout and authoring documentation**

```astro
<h1>{frontmatter.title}</h1>
<p class="article-header__subtitle">{frontmatter.subtitle}</p>
```

README must demonstrate plain Markdown and state that visualization registration lives outside content.

- [x] **Step 5: Run content and baseline checks**

Run: `npm test -- src/content/authoring-policy.test.ts && npm run check && npm run build`
Expected: PASS with no Markdown processor deprecation warning.

- [x] **Step 6: Commit**

```bash
git add package.json package-lock.json astro.config.ts src/content.config.ts src/content/posts/linear-regression.md src/layouts/PostLayout.astro src/content/authoring-policy.test.ts README.md
git commit -m "feat: enforce Markdown-only posts"
```

### Task 2: Build-validated visualization manifest and slot insertion

**Files:**
- Create: `src/visualizations/manifest.ts`
- Create: `src/visualizations/manifest.test.ts`
- Create: `src/visualizations/client-registry.ts`
- Create: `src/integrations/visualization-slots.ts`
- Create: `src/integrations/visualization-slots.test.ts`
- Modify: `astro.config.ts`

**Interfaces:**
- Produces `AccentName`, `VisualizationPlacement`, and `postVisualizations`.
- Produces `validateVisualizationContent(posts, manifest, loaderIds): ValidationIssue[]` as a pure function.
- Produces `visualizationValidationIntegration(): AstroIntegration` for mandatory config-time validation.
- Produces `rehypeVisualizationSlots()` that inserts `.visualization-slot[data-visualization-id]` after exact headings.
- Produces `visualizationLoaders` with IDs matching the manifest.

- [x] **Step 1: Write failing manifest validation tests**

```ts
expect(validateVisualizationContent(validPosts, manifest, loaderIds)).toEqual([]);
expect(validateVisualizationContent(postsWithoutHeading, manifest, loaderIds)[0]?.code)
  .toBe('missing-heading');
expect(validateVisualizationContent(postsWithDuplicateHeading, manifest, loaderIds)[0]?.code)
  .toBe('duplicate-heading');
```

Also assert `missing-post`, `duplicate-placement`, `missing-loader`, and `orphan-loader` codes include the slug or visualization ID in their message.

- [x] **Step 2: Run the tests and verify missing modules fail**

Run: `npm test -- src/visualizations/manifest.test.ts src/integrations/visualization-slots.test.ts`
Expected: FAIL because the manifest and integration do not exist.

- [x] **Step 3: Implement pure metadata and validation**

```ts
export const postVisualizations = {
  'linear-regression': [
    { id: 'linear-regression:model', afterHeading: '직접 움직여보기', accent: 'cyan', title: '선형 모델 조절', description: '기울기와 절편을 바꾸며 회귀선을 관찰합니다.' },
    { id: 'linear-regression:residuals', afterHeading: 'Residual Visualization', accent: 'red', title: '잔차 관찰', description: '관찰값과 예측값 사이의 잔차를 비교합니다.' },
    { id: 'linear-regression:best-fit', afterHeading: 'Find Best Fit', accent: 'yellow', title: '최적선 찾기', description: '평균제곱오차가 최소인 직선으로 이동합니다.' },
  ],
} as const;
```

Use a fenced-code-aware Markdown heading scanner for config-time validation. Do not treat `##` inside fenced code as headings.

- [x] **Step 4: Implement HAST slot insertion**

Insert a `section.visualization-slot` containing a mechanical label, title, description, ASCII loading `<pre aria-hidden="true">`, polite status, hidden error panel, retry button, and `<noscript>` explanation. Derive the slug from `file.path`; throw a precise error if the already-validated contract is violated during transformation.

- [x] **Step 5: Register validation and the rehype plugin in Astro config**

```ts
integrations: [react(), visualizationValidationIntegration()],
markdown: {
  processor: unified({
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeVisualizationSlots, rehypeKatex],
  }),
},
```

- [x] **Step 6: Verify focused tests and build enforcement**

Run: `npm test -- src/visualizations/manifest.test.ts src/integrations/visualization-slots.test.ts && npm run check && npm run build`
Expected: PASS and the built linear-regression HTML contains all three visualization IDs after their headings.

- [x] **Step 7: Commit**

```bash
git add astro.config.ts src/integrations src/visualizations/manifest.ts src/visualizations/manifest.test.ts src/visualizations/client-registry.ts
git commit -m "feat: insert validated visualization slots"
```

### Task 3: Lazy visualization mounting and retry lifecycle

**Files:**
- Create: `src/visualizations/mount-visualizations.ts`
- Create: `src/visualizations/mount-visualizations.test.ts`
- Modify: `src/layouts/PostLayout.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes `visualizationLoaders[id](): Promise<{ default: ComponentType<VisualizationProps> }>`.
- Produces `mountVisualizations(options?): () => void`; the returned function disconnects the observer and unmounts every root.
- Passes `{ accent: AccentName }` to each dynamically imported scene.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
expect(loader).not.toHaveBeenCalled();
observer.trigger(slot);
await waitFor(() => expect(loader).toHaveBeenCalledTimes(1));
observer.trigger(slot);
expect(createRoot).toHaveBeenCalledTimes(1);
cleanup();
expect(unmount).toHaveBeenCalledTimes(1);
```

Add a rejected-loader test that exposes the error panel, hides loading, and succeeds exactly once after the native retry button is clicked.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/visualizations/mount-visualizations.test.ts`
Expected: FAIL because `mountVisualizations` does not exist.

- [ ] **Step 3: Implement observer, dynamic runtime import, mount-once, retry, and cleanup**

The entry module must not statically import React, React DOM, or any scene. Load `react`, `react-dom/client`, and the selected component only after intersection. Use `root.unmount()` as the scene cleanup boundary.

- [ ] **Step 4: Load the entry point only from post layout**

```astro
<script>
  import { mountVisualizations } from '../visualizations/mount-visualizations';
  mountVisualizations();
</script>
```

- [ ] **Step 5: Run lifecycle tests and build**

Run: `npm test -- src/visualizations/mount-visualizations.test.ts && npm run build`
Expected: PASS; non-post pages contain no visualization entry script and no eager `manim-web` import.

- [ ] **Step 6: Commit**

```bash
git add src/visualizations/mount-visualizations.ts src/visualizations/mount-visualizations.test.ts src/layouts/PostLayout.astro src/styles/global.css
git commit -m "feat: lazily mount registered visualizations"
```

### Task 4: Decompose the linear-regression lesson into three single-accent scenes

**Files:**
- Modify: `src/components/visualizations/linear-regression/LinearRegressionDemo.tsx`
- Modify: `src/components/visualizations/linear-regression/LinearRegressionSceneController.ts`
- Modify: `src/components/visualizations/linear-regression/LinearRegressionSceneController.test.ts`
- Modify: `src/components/visualizations/linear-regression/linear-regression.css`
- Create: `src/visualizations/linear-regression/LineModelDemo.tsx`
- Create: `src/visualizations/linear-regression/ResidualDemo.tsx`
- Create: `src/visualizations/linear-regression/BestFitDemo.tsx`
- Modify: `src/visualizations/client-registry.ts`
- Modify: `src/components/manim/ResponsiveManimScene.tsx`
- Modify: `src/components/manim/ResponsiveManimScene.test.tsx`
- Modify: `tests/linear-regression.spec.ts`

**Interfaces:**
- `LinearRegressionDemo` consumes `focus: 'model' | 'residuals' | 'best-fit'` and `accent: AccentName`.
- `LinearRegressionSceneController` consumes a palette whose inactive geometry is gray and whose focused geometry uses one accent.
- Each wrapper default-exports a React component accepting `{ accent: AccentName }`.

- [ ] **Step 1: Extend failing controller and component tests**

Assert model focus colors only the line, residual focus colors only residuals, and best-fit focus colors only the best-fit line/target. Assert every other mobject uses neutral tokens. Preserve disposal, late async cleanup, and reduced-motion coverage.

- [ ] **Step 2: Run focused tests and verify the new expectations fail**

Run: `npm test -- src/components/visualizations/linear-regression/LinearRegressionSceneController.test.ts src/components/manim/ResponsiveManimScene.test.tsx`
Expected: FAIL because focus and palette inputs do not exist.

- [ ] **Step 3: Add focus/palette support without duplicating math or lifecycle code**

```ts
type RegressionFocus = 'model' | 'residuals' | 'best-fit';
type RegressionPalette = { foreground: string; muted: string; accent: string };
```

Keep one dataset and the existing pure `regressionMath` functions. Render scene-specific controls and explanations from the shared demo. Set the scene background to near-black through a wrapper prop rather than a hard-coded paper color.

- [ ] **Step 4: Add three thin registered wrappers**

```tsx
export default function LineModelDemo({ accent }: VisualizationProps) {
  return <LinearRegressionDemo focus="model" accent={accent} />;
}
```

Residual and best-fit wrappers use the corresponding focus. Update `client-registry.ts` to load these modules.

- [ ] **Step 5: Replace the all-in-one E2E assumptions**

Verify three slots, lazy canvases, slope/intercept interaction, residual MSE synchronization, best-fit reduced motion, reload/history cleanup, and exactly one canvas per activated slot.

- [ ] **Step 6: Run regression unit and browser tests**

Run: `npm test -- src/components/visualizations/linear-regression src/components/manim && npx playwright test tests/linear-regression.spec.ts`
Expected: PASS at 390px, 768px, and 1440px.

- [ ] **Step 7: Commit**

```bash
git add src/components/manim src/components/visualizations/linear-regression src/visualizations/linear-regression src/visualizations/client-registry.ts tests/linear-regression.spec.ts
git commit -m "feat: split regression lesson into focused scenes"
```

### Task 5: ASCII registry and shared brutalist components

**Files:**
- Create: `src/design/ascii/types.ts`
- Create: `src/design/ascii/registry.ts`
- Create: `src/design/ascii/validate-ascii.ts`
- Create: `src/design/ascii/ascii.test.ts`
- Create: `src/design/ascii/site-hero.ts`
- Create: `src/design/ascii/not-found.ts`
- Create: `src/design/ascii/category-defaults.ts`
- Create: `src/design/ascii/linear-regression.ts`
- Create: `src/components/design/AsciiArt.astro`
- Create: `src/components/design/MechanicalLabel.astro`
- Create: `src/components/posts/PostRow.astro`
- Create: `src/components/posts/PostPager.astro`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces `resolveAsciiArt({ slug?, category?, kind }): AsciiArtEntry` with slug → category → neutral fallback.
- Produces `validateAsciiArt(entry): AsciiValidationIssue[]`.
- `PostRow` consumes one `CollectionEntry<'posts'>`, its sequence number, and optional accent.
- `PostPager` consumes optional older/newer post entries.

- [ ] **Step 1: Write failing resolver and width-validation tests**

```ts
expect(resolveAsciiArt({ slug: 'linear-regression', category: 'Statistics', kind: 'detail' }).id)
  .toBe('linear-regression');
expect(resolveAsciiArt({ slug: 'unknown', category: 'Statistics', kind: 'detail' }).id)
  .toBe('category-statistics');
expect(validateAsciiArt(inconsistentWidthArt)[0]?.code).toBe('inconsistent-width');
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/design/ascii/ascii.test.ts`
Expected: FAIL because the ASCII system does not exist.

- [ ] **Step 3: Implement curated responsive art and validation**

Each entry contains `id`, `label`, `desktop`, `mobile`, and `thumbnail`. Use arrays of equal-width lines per variant and join only at render time. Desktop maximum is 78 columns; mobile maximum is 34; thumbnail maximum is 22.

- [ ] **Step 4: Build accessible Astro components**

`AsciiArt.astro` exposes a readable `.ascii-art__label`, marks each glyph `<pre>` `aria-hidden="true"`, and uses CSS media queries to switch variants. `PostRow.astro` uses a stretched pseudo-element for the main post link while topic anchors remain above it and valid.

- [ ] **Step 5: Replace tokens and global visual foundation**

Define near-black, white, gray, border, cyan, red, yellow, and violet tokens. Remove paper, cobalt, coral, green, radius, neumorphic shadow, and gradient usage. Preserve skip-link and focus behavior.

- [ ] **Step 6: Run ASCII tests, Astro check, and build**

Run: `npm test -- src/design/ascii/ascii.test.ts && npm run check && npm run build`
Expected: PASS with no page-level overflow in generated static markup/CSS assumptions.

- [ ] **Step 7: Commit**

```bash
git add src/design src/components/design src/components/posts src/styles
git commit -m "feat: add ASCII brutalism design system"
```

### Task 6: Redesign every static route and navigation flow

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/layouts/PostLayout.astro`
- Modify: `src/components/navigation/SiteHeader.astro`
- Modify: `src/components/navigation/SiteFooter.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/pages/posts/index.astro`
- Modify: `src/pages/posts/[...slug].astro`
- Modify: `src/pages/topics/[topic].astro`
- Create: `src/pages/404.astro`
- Create: `src/utils/posts.ts`
- Create: `src/utils/posts.test.ts`
- Modify: `tests/home.spec.ts`
- Modify: `tests/blog.spec.ts`
- Create: `tests/404.spec.ts`

**Interfaces:**
- Produces `getPublishedPosts()` sorted newest-first and `getPostNeighbors(posts, id)` returning `{ older, newer }`.
- Home renders `posts.slice(0, 4)` through `PostRow`.
- Post static-path props include the post and its older/newer neighbors.

- [ ] **Step 1: Write failing sorting, neighbor, and page behavior tests**

```ts
expect(getPostNeighbors(posts, 'middle')).toEqual({ older: posts[2], newer: posts[0] });
await expect(page.getByText('[READ NOTE →]').first()).toBeVisible();
await expect(page.locator('html')).not.toHaveCSS('overflow-x', 'scroll');
```

Add assertions for four-post maximum, real hrefs, keyboard focus, independent topic links, post ASCII, previous/next boundaries, and 404 links.

- [ ] **Step 2: Run focused unit and browser tests and verify old markup fails**

Run: `npm test -- src/utils/posts.test.ts && npx playwright test tests/home.spec.ts tests/blog.spec.ts tests/404.spec.ts`
Expected: FAIL because shared rows, neighbors, 404, ASCII, and mechanical labels are absent.

- [ ] **Step 3: Implement post ordering and neighbor props**

Centralize collection sorting in `src/utils/posts.ts`; remove repeated sort expressions from pages. Generate static post routes with neighbor props and render `PostPager` in `PostLayout`.

- [ ] **Step 4: Rebuild the home, archive, topic, and post layouts**

Use the approved ASCII hero, up to four recent rows, ruled archive/topic lists, post detail art, mechanical labels, collapsed mobile rails, and monochrome navigation states. Empty collections and topics render intentional copy.

- [ ] **Step 5: Add the static 404 route**

Render the curated not-found art, `[RETURN HOME →]`, and `[OPEN ARCHIVE →]` with `withBase()` URLs.

- [ ] **Step 6: Run route tests at all target viewports**

Run: `npm test -- src/utils/posts.test.ts && npx playwright test tests/home.spec.ts tests/blog.spec.ts tests/404.spec.ts`
Expected: PASS with no horizontal overflow at 390px, 768px, or 1440px.

- [ ] **Step 7: Commit**

```bash
git add src/layouts src/components/navigation src/pages src/utils/posts.ts src/utils/posts.test.ts tests/home.spec.ts tests/blog.spec.ts tests/404.spec.ts
git commit -m "feat: redesign learning note routes"
```

### Task 7: Documentation, final regression coverage, and release verification

**Files:**
- Modify: `README.md`
- Modify: `tests/smoke.spec.ts`
- Modify: `.github/workflows/deploy.yml` only if the existing serial command order does not run all required checks
- Modify: plan checkboxes in `docs/superpowers/plans/2026-08-15-ascii-brutalism-learning-notes.md`

**Interfaces:**
- Documents the exact plain Markdown author workflow and external visualization registration workflow.
- Leaves CI executing check, unit test, build, and deploy in deterministic serial order.

- [ ] **Step 1: Add final smoke assertions**

Assert the built home has the black theme-color, ASCII hero label, archive path, and no eager canvas. Assert the post has three registered slots and meaningful no-script/fallback text.

- [ ] **Step 2: Update README and CI documentation**

Include a complete `.md` example and separate maintainer-only manifest example. State that authors never add imports, `client:*`, wrappers, ASCII art, or Scene cleanup to content.

- [ ] **Step 3: Run the complete verification suite serially**

```bash
npm run check
npm test
npm run build
npm run test:e2e
```

Expected: zero errors; all unit and Playwright tests pass. Deprecation warnings from the old Markdown configuration are absent. Any remaining bundle-size warning is recorded but acceptable only if non-post routes do not load the visualization chunk.

- [ ] **Step 4: Inspect the final diff and worktree state**

Run: `git diff --check && git status --short && git diff --stat origin/main...HEAD`
Expected: no whitespace errors and only issue #2 files/commits.

- [ ] **Step 5: Commit final documentation and verification updates**

```bash
git add README.md tests/smoke.spec.ts .github/workflows/deploy.yml docs/superpowers/plans/2026-08-15-ascii-brutalism-learning-notes.md
git commit -m "test: verify ASCII learning notes experience"
```
