# Manim-inspired GitHub Pages site design

## Goal

Build a GitHub Pages site for `sorbetsharkroundhand/mygithubiosite` inspired by the public `3b1b/manim` repository page and its developer-documentation flow. The site will introduce a personal or portfolio-facing animation project, make the project easy to understand, and guide visitors toward installation, examples, documentation, and source code.

This phase is planning only. No application code, generated assets, or deployment workflow will be implemented yet.

## Reference and boundaries

The reference is the public `3b1b/manim` repository: a project overview, installation instructions, usage examples, documentation links, contribution guidance, license, and repository metadata. We will borrow the information architecture and open-source tone, not copy GitHub's UI, Manim's branding, text, logos, or source assets.

## Recommended approach

Use a static, content-first site that can deploy to GitHub Pages with GitHub Actions. Prefer Astro with scoped CSS for the eventual implementation because it supports documentation-like pages, ships minimal JavaScript, and leaves room for small interactive animation demos. Keep content in Markdown or typed data files so the project can grow without turning the landing page into a single large component.

Alternatives considered:

- Plain HTML/CSS/JS: simplest deployment, but content and navigation become harder to maintain as pages grow.
- React/Vite: flexible for interactive demos, but more runtime and structure than the first version needs.

## Visual direction

Create an editorial “mathematical instrument” identity rather than a direct GitHub clone:

- Deep graphite background with paper-white type and a restrained electric-coral accent.
- Display typography with a technical grotesk feel; body copy optimized for readable documentation.
- Thin coordinate/grid marks, equation-like labels, and diagram annotations used sparingly.
- The signature element is a hero animation that turns a simple geometric construction into a recognizable project mark.
- Motion should be purposeful: one hero reveal, subtle diagram line-drawing, and reduced-motion fallbacks.

The layout should be responsive, keyboard navigable, and legible on small screens. Focus states and `prefers-reduced-motion` support are required.

## Planned pages and sections

### Landing page

1. Header with project name, Docs, Examples, GitHub, and a compact mobile menu.
2. Hero with a concise project thesis, primary “Explore examples” action, secondary “View source” action, and the signature geometry animation.
3. “What it does” section explaining the project in three short capabilities.
4. Example gallery with 3–6 visual cards; initially these can point to curated demos or placeholder media prepared later.
5. Quick-start strip with install command and a minimal first command.
6. Documentation and community links.
7. Footer with source, license, version/status, and attribution.

### Documentation page

Provide a stable sidebar or in-page navigation with Overview, Installation, First scene, CLI reference, and FAQ. The first implementation should keep the content concise and link outward when full technical documentation belongs elsewhere.

### Examples page

Present examples as a filterable or categorized gallery. Each item needs a title, short explanation, visual preview, source link, and “what to notice” note. Interactivity should be progressive enhancement; the page must remain useful without JavaScript.

## Technical architecture

- Astro static build.
- Markdown content collections for docs and examples.
- Shared components: `SiteHeader`, `SiteFooter`, `HeroScene`, `SectionHeading`, `ExampleCard`, `CodeBlock`, and `DocsNav`.
- CSS tokens for color, type scale, spacing, borders, and motion durations.
- Small client-side islands only for the hero animation, mobile navigation, and example filtering.
- External links for source code and full documentation; no backend or database in v1.

## GitHub Pages deployment plan

1. Configure the Astro site for the repository base path.
2. Add a GitHub Actions workflow that installs dependencies, builds the static site, uploads the build artifact, and deploys to GitHub Pages.
3. Enable Pages from GitHub Actions in repository settings.
4. Verify both the project URL and direct navigation to nested documentation pages.

The repository should use `main` as the default branch. The eventual site URL will be `https://sorbetsharkroundhand.github.io/mygithubiosite/` unless a custom domain is added later.

## Content and asset plan

Use original copy and original/generated visual assets. Do not scrape or redistribute Manim/3Blue1Brown media without checking its license and attribution requirements. The first content pass should use a small, coherent set of examples rather than a large catalog.

## Verification plan for implementation phase

- Build succeeds locally.
- No broken internal or external links in the planned navigation.
- Responsive checks at mobile, tablet, and desktop widths.
- Keyboard navigation reaches all controls and exposes visible focus.
- Reduced-motion mode disables non-essential animation.
- GitHub Actions deploys successfully and nested routes load on GitHub Pages.

## Out of scope for v1

- User accounts, comments, search indexing, analytics, CMS, API, or server-side rendering.
- Recreating GitHub's repository interface pixel-for-pixel.
- Embedding a full Manim runtime in the browser.
- Copying proprietary or third-party visual assets.

## Next step

After this plan is approved, create an implementation plan, scaffold the static site, establish the visual system, then build and visually verify the landing page before adding documentation and examples.
