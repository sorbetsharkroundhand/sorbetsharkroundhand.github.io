# Interactive Notes

통계, 머신러닝, 인공지능과 수학을 직접 움직이며 이해하는 정적 학습 노트입니다. Astro가 실제 HTML 페이지를 만들고, 일반 Markdown이 글을 관리하며, 등록된 위치에서만 React와 `manim-web` 인터랙션을 불러옵니다.

## 로컬 실행

Node.js 24와 npm을 기준으로 합니다.

```bash
npm ci
npm run dev
```

기본 개발 주소는 `http://localhost:4321`입니다. 변경 사항을 제출하기 전에는 다음 검증을 실행합니다.

```bash
npm run check
npm test
npm run build
npm run test:e2e
```

Playwright 브라우저가 아직 설치되지 않았다면 먼저 `npx playwright install chromium`을 실행합니다.

## 글 작성

새 글은 `src/content/posts/`에 `.md` 파일로 추가합니다. frontmatter는 다음 필드를 사용합니다.

```yaml
---
title: 글 제목
subtitle: 글의 한 줄 부제
description: 목록과 메타데이터에 표시할 설명
publishedAt: 2026-08-15
category: Statistics
topics:
  - statistics
draft: false
---
```

- `title`, `subtitle`, `description`, `publishedAt`, `category`, `topics`, `draft`는 필수입니다.
- `draft: true`인 글은 공개 목록과 정적 경로에서 제외됩니다.
- 수식은 `$...$` 또는 `$$...$$`로 작성합니다. 본문 수식은 KaTeX가 정적 HTML로 렌더링합니다.

작성자는 본문에 React import, 컴포넌트, hydration 지시자, ASCII 아트, figure wrapper를 넣지 않습니다. 시각화는 `src/visualizations/manifest.ts`에서 글 slug와 heading을 기준으로 별도 등록하며, 화면에 가까워졌을 때만 자동으로 불러옵니다. 계산은 순수 TypeScript 모듈에, `manim-web` 객체와 수명주기는 별도 controller에, UI 상태는 React 컴포넌트에 둡니다.

## GitHub Pages 배포

이 저장소는 사용자 사이트 `https://sorbetsharkroundhand.github.io/`를 대상으로 하므로 기본 base path는 `/`입니다. `main`에 push하거나 Actions 화면에서 수동 실행하면 `.github/workflows/deploy.yml`이 검사·테스트·정적 빌드 후 `dist/`를 Pages에 배포합니다.

저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택해야 합니다. GitHub의 [custom Pages workflow 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)도 함께 참고할 수 있습니다.

프로젝트 사이트로 재사용할 때는 저장소 이름을 포함한 base path를 빌드 환경에 지정합니다.

```bash
DEPLOY_BASE=/repository-name/ npm run build
```

`astro.config.ts`와 내부 링크 helper가 이 값을 사용하므로 소스 경로를 다시 작성할 필요가 없습니다.

## manim-web findings

- 잘 동작한 기능: `Scene`, `Axes`, `FunctionGraph`, `MathTex`, `ValueTracker`, animation, resize, dispose
- 제약이 있었던 기능: fixed-size `ManimScene` defaults, independent interaction-handle cleanup, non-cancellation-safe `play` promise
- 사용한 workaround: custom responsive wrapper, controller-owned cleanup, disabled controls during play
- 향후 library contribution 후보: responsive React component defaults and cancellation-safe playback

현재 선형회귀 장면은 하나의 `Scene`과 안정적인 mobject를 유지합니다. 슬라이더 변경 때 장면을 재생성하지 않으며, Best Fit 재생 중에는 충돌하는 입력을 잠그고 `prefers-reduced-motion`에서는 같은 최종 상태를 즉시 표시합니다.
