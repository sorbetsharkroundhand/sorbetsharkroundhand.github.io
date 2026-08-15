# Scrollytelling Scene Architecture

이 문서는 홈에서 시작한 스크롤 장면 구조를 이후 공부 자료와 포트폴리오에 확장할 때 지켜야 할 경계를 설명한다.

## 기본 원칙

의미 있는 콘텐츠는 Astro가 정적 HTML로 렌더한다. 제목, 설명, 본문, 게시글과 프로젝트 링크는 JavaScript·WebGL·Canvas가 실패해도 남아 있어야 한다. 시각 장면은 이 콘텐츠를 대체하지 않고 진행률에 맞춰 해석한다.

각 라우트의 스크롤 mount는 문서 위치를 `0..1` 진행률로 바꾼다. 장면은 시간이나 이전 프레임을 누적하지 않고 진행률을 순수 함수로 샘플링한다. 따라서 아래로 스크롤할 때와 위로 되감을 때 같은 위치는 같은 상태가 된다.

## 공통 컨트롤러

모든 시각 장면은 `src/scrollytelling/ScrollSceneController.ts`의 계약을 구현한다.

```ts
export interface ScrollSceneController {
  setProgress(progress: number): void;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}
```

- `setProgress()`는 입력을 `0..1`로 제한하고 직접 상태를 적용한다.
- `resize()`는 현재 진행률을 잃지 않고 투영과 렌더 크기만 조정한다.
- `dispose()`는 observer, animation frame, Canvas, WebGL 리소스를 한 번만 정리한다.
- 스크럽 경로에서 `scene.play()`를 반복 실행하지 않는다.

홈의 `ScrollProgressDriver`는 여러 scroll update를 한 animation frame의 최신 값 하나로 합친다. 다른 라우트도 같은 driver를 재사용할 수 있지만, 홈 전용 타임라인과 컨트롤러를 직접 import하지 않는다.

## 라우트별 구성

새 장면은 다음 네 경계를 분리한다.

1. Astro 컴포넌트: 정적 콘텐츠와 실제 anchor를 렌더한다.
2. 타임라인 함수: 진행률을 chapter와 시각 상태로 변환한다.
3. route-local mount: 스크롤 위치를 진행률로 바꾸고 DOM 상태를 배포한다.
4. 시각 controller: Manim, Canvas 또는 DOM 장식을 갱신한다.

Manim이나 무거운 Canvas 코드는 해당 라우트의 island에서 동적으로 import한다. 다른 페이지가 그 chunk를 요청하지 않는지 production build와 Playwright request 기록으로 확인한다.

## 향후 공부 장면 예시

```ts
import {
  clampProgress,
  type ScrollSceneController,
} from '../scrollytelling/ScrollSceneController';

interface StudySample {
  lineOpacity: number;
  parameter: number;
}

export class StudySceneController implements ScrollSceneController {
  private disposed = false;
  private progress = 0;
  private viewport = { height: 1, pixelRatio: 1, width: 1 };

  setProgress(progress: number): void {
    if (this.disposed) return;
    this.progress = clampProgress(progress);
    this.applySample(this.sample(this.progress));
  }

  resize(width: number, height: number, pixelRatio: number): void {
    if (this.disposed) return;
    this.viewport = { height, pixelRatio, width };
    this.applySample(this.sample(this.progress));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.releaseResources();
  }

  private sample(progress: number): StudySample {
    return {
      lineOpacity: Math.min(1, progress * 2),
      parameter: -2 + progress * 4,
    };
  }

  private applySample(_sample: StudySample): void {
    this.renderCurrentViewport();
  }

  private renderCurrentViewport(): void {
    void this.viewport;
  }

  private releaseResources(): void {
    this.viewport = { height: 1, pixelRatio: 1, width: 1 };
  }
}
```

이 코드는 아키텍처 계약의 예시다. 게시글 Markdown에 붙여 넣는 코드가 아니다.

## Markdown 작성 경계

게시글 작성자는 계속 Markdown만 다룬다. React·Astro·Manim 코드는 `src/components`, `src/scrollytelling`, `src/visualizations`에 둔다. 공부 글의 시각화는 현재 visualization manifest처럼 별도 등록하고, 포트폴리오 장면은 해당 라우트의 manifest 또는 loader를 갖는다.

콘텐츠가 없어도 동작하는 장식보다, 장식이 없어도 읽히는 콘텐츠를 먼저 만든다. 그 위에 진행률 기반 시각 장면을 얹는 순서를 유지한다.
