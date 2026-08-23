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
title: Linear Regression
subtitle: 선형회귀를 눈으로 이해하기
description: 직선을 움직이며 예측, 잔차, 평균제곱오차를 연결합니다.
publishedAt: 2026-08-15
category: Statistics
topics:
  - linear-regression
  - least-squares
draft: false
---

## 데이터에서 직선 찾기

관찰값을 하나의 직선으로 요약해 봅니다.

$$
\\hat{y} = wx + b
$$
```

- `title`, `subtitle`, `description`, `publishedAt`, `category`, `topics`, `draft`는 필수입니다.
- `draft: true`인 글은 공개 목록과 정적 경로에서 제외됩니다.
- `updatedAt`은 선택 사항입니다.
- 수식은 `$...$` 또는 `$$...$$`로 작성합니다. 본문 수식은 KaTeX가 정적 HTML로 렌더링합니다.

작성자는 본문에 import, React·Astro 컴포넌트, `client:*` hydration 지시자, 레이아웃 wrapper, ASCII 아트, Scene 정리 코드를 넣지 않습니다. 글 파일에는 frontmatter, 일반 Markdown, 수식, 코드 블록만 둡니다.

### 인터랙티브 시각화 등록

시각화가 필요한 글은 작성자 콘텐츠와 분리해 유지보수자가 `src/visualizations/manifest.ts`에 slug와 정확한 제목을 등록합니다.

```ts
export const postVisualizations = {
  'linear-regression': [
    {
      id: 'linear-regression:model',
      afterHeading: '직접 움직여보기',
      accent: 'cyan',
      title: '선형 모델 조절',
      description: '기울기와 절편을 바꾸며 회귀선을 관찰합니다.',
    },
  ],
};
```

같은 ID의 동적 import를 `src/visualizations/client-registry.ts`에 연결합니다. 빌드는 slug, 제목, 중복 위치, 누락된 loader를 검증하고 해당 제목 바로 뒤에 접근 가능한 정적 설명을 삽입합니다. 장면 코드는 화면에 가까워졌을 때만 로드됩니다. 계산은 순수 TypeScript 모듈에, `manim-web` 객체와 수명주기는 controller에, UI 상태는 React 컴포넌트에 둡니다.

## 댓글 (giscus)

포스트 하단의 댓글은 [giscus](https://giscus.app/ko)로 GitHub Discussion과 연결됩니다. 댓글 작성은 방문자의 GitHub 로그인으로 진행됩니다.

설정 방법:

1. 저장소에서 **Settings → General → Features → Discussions**를 켭니다.
2. [giscus 앱](https://github.com/apps/giscus)을 저장소에 설치합니다.
3. [giscus.app](https://giscus.app/ko)에서 repo · repoId · category · categoryId를 확인합니다.
4. 프로젝트 루트의 `.env`에 다음 네 값을 채웁니다. 값이 없으면 포스트 하단에 안내 문구만 표시됩니다.

```bash
PUBLIC_GISCUS_REPO=sorbetsharkroundhand/sorbetsharkroundhand.github.io
PUBLIC_GISCUS_REPO_ID=...
PUBLIC_GISCUS_CATEGORY=Announcements
PUBLIC_GISCUS_CATEGORY_ID=...
```

## 노트 스튜디오 (/studio)

GitHub 로그인 후 노트를 작성해 이 저장소에 바로 발행하는 관리자 페이지입니다. 정적 호스팅 특성상 OAuth 리다이렉트 대신 **fine-grained personal access token**으로 신원을 확인합니다.

- `/studio` 접속 → 토큰 입력 → `api.github.com/user`로 계정 검증 → 허용된 로그인(`src/config/studio.ts`의 `STUDIO_ALLOWED_LOGINS`)만 에디터가 열립니다.
- 토큰은 탭의 sessionStorage에만 보관되고 api.github.com 외 어디로도 전송되지 않습니다.
- 발행은 GitHub Contents API로 `src/content/posts/<slug>.md`를 커밋하며, push가 Actions 배포를 트리거합니다.
- 토큰 발급: GitHub → Settings → Developer settings → Fine-grained tokens에서 **이 저장소만** 선택하고 **Contents: Read and write** 권한, 짧은 만료일을 권장합니다.
- 같은 슬러그를 다시 발행하면 덮어쓰기 확인을 거칩니다. `draft` 체크 시 공개 목록에서 제외된 초안으로 커밋됩니다.

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
