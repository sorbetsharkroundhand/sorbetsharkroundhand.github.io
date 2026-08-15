# Post Interior and Supplied Hero ASCII Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete issue #2's post-detail experience with a navigable ASCII learning-note interior and replace the home hero with the user's supplied ASCII composition.

**Architecture:** The supplied art remains a registry-owned static asset and is parsed into aligned lines by the existing ASCII module. Astro's Markdown renderer supplies heading metadata to `PostLayout`, which renders a real fragment-link index beside the prose without changing Markdown authoring. Native CSS establishes the desktop reading rail and mobile top index while existing visualization slots keep their lazy lifecycle.

**Tech Stack:** Astro 5, TypeScript, native CSS, Vitest, Playwright

## Global Constraints

- Do not create or use subagents.
- Preserve `.md`-only authoring and all existing heading IDs.
- Preserve the supplied ASCII's non-empty line characters and internal spacing; remove only blank outer lines and uniform shared indentation.
- Render the same supplied composition on desktop and mobile.
- Keep the site near-black, sharp-cornered, static-first, keyboard-accessible, and free of horizontal overflow at 390px.
- Preserve visualization lazy initialization, retry, cleanup, and one accent per scene.
- Do not change route slugs or educational prose.

---

### Task 1: Register the supplied home ASCII composition

**Files:**
- Create: `src/design/ascii/site-hero.txt`
- Modify: `src/design/ascii/site-hero.ts`
- Modify: `src/design/ascii/types.ts`
- Modify: `src/design/ascii/validate-ascii.ts`
- Modify: `src/design/ascii/ascii.test.ts`
- Modify: `src/components/design/AsciiArt.astro`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: the attached 123-line ASCII text.
- Produces: `normalizeAsciiSource(source: string): readonly string[]` and a `site-hero` registry entry whose desktop and mobile variants contain the same normalized composition.

- [x] **Step 1: Write the failing supplied-art tests**

Assert that normalization removes blank outer rows, preserves interior spaces and punctuation, retains more than 90 non-empty rows, and returns the exact same array for the site hero's desktop and mobile variants.

```ts
expect(siteHeroArt.desktop).toEqual(siteHeroArt.mobile);
expect(siteHeroArt.desktop.length).toBeGreaterThan(90);
expect(siteHeroArt.desktop.join('\n')).toContain('-,,,,,,,,,.');
expect(validateAsciiArt(siteHeroArt)).toEqual([]);
```

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/design/ascii/ascii.test.ts`
Expected: FAIL because the current hero is the generated coordinate illustration and the validator rejects a 100-column entry.

- [x] **Step 3: Add the exact text asset and normalization contract**

Import `site-hero.txt?raw`, trim only fully blank outer lines, calculate the minimum leading whitespace shared by non-empty lines, remove only that indentation, and right-pad the remaining lines to equal width. Add an optional per-entry `columnLimits` override so the supplied hero can validate without weakening post and thumbnail limits.

```ts
export interface AsciiArtEntry {
  id: string;
  label: string;
  desktop: AsciiVariant;
  mobile: AsciiVariant;
  thumbnail: AsciiVariant;
  columnLimits?: Partial<Record<'desktop' | 'mobile' | 'thumbnail', number>>;
}
```

- [x] **Step 4: Render the same art responsively**

Mark the supplied hero with a dedicated class through `data-ascii-id="site-hero"`. Scale only font size and line height across breakpoints; do not crop, substitute, or transform the character arrangement.

- [x] **Step 5: Run focused tests, Astro check, and build**

Run: `npm test -- src/design/ascii/ascii.test.ts && npm run check && npm run build`
Expected: PASS and generated home HTML contains the supplied punctuation composition.

- [x] **Step 6: Commit**

```bash
git add src/design/ascii src/components/design/AsciiArt.astro src/styles/global.css
git commit -m "feat: use supplied ASCII hero artwork"
```

### Task 2: Build the navigable post reading shell

**Files:**
- Create: `src/components/posts/PostIndex.astro`
- Modify: `src/pages/posts/[...slug].astro`
- Modify: `src/layouts/PostLayout.astro`
- Modify: `src/styles/global.css`
- Modify: `tests/blog.spec.ts`

**Interfaces:**
- Consumes: Astro `MarkdownHeading[]` returned by `render(post)`.
- Produces: `PostIndex` with `headings: MarkdownHeading[]`, real `#slug` links, and a responsive `.article-reading-shell`.

- [x] **Step 1: Write failing browser assertions for the post interior**

Assert seven level-two index links, exact source order, a working fragment link to `#residual-visualization`, visible section counters, and no horizontal overflow at 390px, 768px, and 1440px.

```ts
await expect(page.getByRole('navigation', { name: '이 글의 목차' }).getByRole('link')).toHaveCount(7);
await expect(page.getByRole('link', { name: 'Residual Visualization' })).toHaveAttribute(
  'href',
  '#residual-visualization',
);
```

- [x] **Step 2: Run the focused browser test and verify it fails**

Run: `npx playwright test tests/blog.spec.ts`
Expected: FAIL because the post interior has no heading index or two-column reading shell.

- [x] **Step 3: Pass heading metadata into the layout**

Read `{ Content, headings } = await render(post)` in the post route and pass `headings.filter(({ depth }) => depth === 2)` to `PostLayout` without altering the rendered Markdown content.

- [x] **Step 4: Implement the article index and reading shell**

Render `PostIndex` before `.article-prose`. Use a sticky desktop rail with real anchor links, then collapse it to a non-sticky top index below 768px. Keep DOM reading order logical and all focus rings visible.

- [x] **Step 5: Restyle internal learning materials**

Use CSS counters for section numbers, a calculation band for `.katex-display`, an instrument panel for code blocks, an observation treatment for blockquotes, and existing breakout geometry for visualization slots. Do not add cards, rounded corners, decorative animation, or new client code.

- [x] **Step 6: Run the post tests at all target viewports**

Run: `npx playwright test tests/blog.spec.ts tests/linear-regression.spec.ts`
Expected: PASS with the seven-link index, intact three-scene interactions, and no page overflow.

- [x] **Step 7: Commit**

```bash
git add src/components/posts/PostIndex.astro src/pages/posts/[...slug].astro src/layouts/PostLayout.astro src/styles/global.css tests/blog.spec.ts
git commit -m "feat: redesign post reading interior"
```

### Task 3: Verify and publish the follow-up pull request

**Files:**
- Modify: `docs/superpowers/plans/2026-08-15-post-interior-and-hero-ascii.md`

**Interfaces:**
- Produces: a clean branch, fresh validation evidence, and a follow-up draft pull request because PR #3 was merged before this work began.

- [x] **Step 1: Run the complete suite serially**

```bash
npm run check
npm test
npm run build
npm run test:e2e
```

Expected: zero errors, all unit tests pass, all Playwright tests pass, and the only acceptable warning is the existing lazy visualization chunk-size warning.

- [x] **Step 2: Perform visual QA**

Capture and inspect the home and post at 1440px and 390px. Confirm the exact supplied hero remains recognizable, the post index does not cover prose, the hero CTA remains in the initial viewport, and no clipped text or horizontal page scroll appears.

- [x] **Step 3: Run the design pre-flight and repository audit**

Run: `rg -n "[—–]" src README.md tests || true && git diff --check && git status -sb`
Expected: no forbidden dash characters, no whitespace errors, and only the planned commit ahead of the pushed branch.

- [x] **Step 4: Commit the completed plan and push**

```bash
git add docs/superpowers/plans/2026-08-15-post-interior-and-hero-ascii.md
git commit -m "test: verify post interior follow-up"
git push
```

- [x] **Step 5: Confirm the follow-up draft PR points to the new head**

Run: `gh pr view 4 --json url,isDraft,headRefOid,statusCheckRollup`
Expected: draft PR #4 is open and its head SHA matches local `HEAD`.
