# Artwork-First Home Scrollytelling with manim-web

## 상태와 범위

이 문서는 `sorbetsharkroundhand.github.io`의 메인페이지를 작품형 스크롤텔링 경험으로 교체하는 설계다. 사용자가 승인한 우선순위는 작품성과 첫인상 75%, 게시글 탐색 25%다.

변경 대상은 홈 라우트와 홈에서만 사용되는 공유 스크롤 장면 기반이다. 기존 게시글 Markdown, 아카이브·토픽·게시글 라우트, `manim-web` 학습 시각화 등록 방식, GitHub Pages 배포 방식은 그대로 유지한다.

이번 작업에서 앞으로의 공부 자료와 포트폴리오가 같은 방식으로 확장될 수 있도록 정규화된 스크롤 진행률 기반의 장면 컨트롤러 계약을 만든다. 다만 실제 게시글을 스크롤텔링으로 전환하거나 포트폴리오 라우트를 추가하는 작업은 포함하지 않는다.

## 목표

메인페이지는 “불확실성 속에서 구조를 발견하고, 발견한 구조가 기록으로 정리되는 과정”을 하나의 연속된 작품으로 보여준다.

완료된 화면은 다음 조건을 만족해야 한다.

- 첫 화면은 일반적인 블로그 목록이 아니라 전체 화면의 몰입형 장면으로 인식된다.
- 스크롤 진행과 `manim-web` 3D 장면, ASCII 유체, HTML 타이포그래피가 하나의 시간축에서 되감기 가능하게 움직인다.
- 장면이 끝나면 최대 3개의 최신 게시글과 전체 아카이브 진입 경로가 명확하게 나타난다. 공개 글이 3개보다 적으면 존재하는 글만 표시한다.
- 핵심 제목과 게시글 링크는 WebGL·Canvas·JavaScript 실패와 무관하게 정적 HTML로 접근 가능하다.
- 메인용 장면 코드는 향후 학습 자료와 포트폴리오 장면이 구현할 수 있는 재사용 계약을 제공한다.
- 홈 이외의 정적 페이지는 새 `manim-web` 홈 장면이나 GSAP 코드를 내려받지 않는다.

## 참고자료 반영

### Schemas of Uncertainty

- 고정된 일러스트 대신 살아 움직이는 ASCII 유체와 노이즈를 사용한다.
- 장식과 콘텐츠를 분리하지 않고, 문자 자체가 공간과 전환을 구성하게 한다.
- 세리프와 모노스페이스의 편집적 대비, 넓은 빈 공간, 낯선 정렬을 사용한다.

### Topology

- 첫 화면을 채우는 어두운 3D 공간과 절제된 한 문장을 사용한다.
- 흰색 구조와 한 가지 차가운 강조색만으로 깊이를 표현한다.
- 카드나 패널보다 곡면, 카메라, 빛, 밀도 변화로 장면을 구분한다.

### Pixellated Section

- 자동 재생 영상이 아니라 사용자의 스크롤 진행률에 정확히 결합된 장면을 만든다.
- 장면은 앞뒤로 자연스럽게 되감기며 구간마다 명확한 시각 상태를 가진다.
- 스크롤 구간이 끝나면 실제 다음 콘텐츠가 자연스럽게 이어진다.

### manim-web

- `ThreeDScene`, `Surface3D`, `ThreeDAxes`, `Dot3D`, `ValueTracker`를 사용해 수학적 3D 구조를 만든다.
- `manim-web`이 이미 제공하는 Three.js/WebGL 렌더러를 사용하고 별도의 `three` 직접 의존성은 추가하지 않는다.
- 스크럽 경로에서는 비동기 `scene.play()`를 반복 호출하지 않는다. 장면 컨트롤러가 진행률에 따라 mobject와 카메라 상태를 직접 설정하고 한 번 렌더한다.

## 홈 경험의 서사

전체 스크롤 구간은 약 `320vh`이며, 내부의 시각 화면은 `100svh`로 고정된다. 진행률은 0부터 1까지 정규화한다.

### 1. Emergence — 0.00–0.14

- 거의 검은 화면에 희박한 점과 좌표 흔적이 나타난다.
- 마우스 또는 터치 위치는 구조를 약하게 끌어당기지만 진행 순서를 바꾸지 않는다.
- 좌측 상단에는 작은 모노스페이스 상태 `00::OBSERVING`만 보인다.

### 2. Topology — 0.14–0.38

- `ThreeDAxes`와 `Surface3D`가 노이즈가 섞인 수학적 곡면을 형성한다.
- 곡면은 낮은 해상도의 와이어프레임 또는 점·선 혼합으로 보이며 불투명한 덩어리가 되지 않는다.
- `setProgress()`는 곡면 함수의 진폭, 주파수, 국소 봉우리, 카메라의 `phi`·`theta`·거리 값을 결정한다.

### 3. Statement — 0.38–0.56

- 카메라가 곡면 가장자리를 지나며 중앙의 문장이 읽을 수 있는 대비로 나타난다.
- 제목: `불확실성 속에서 / 구조를 찾습니다.`
- 설명: `통계, 머신러닝, 인공지능을 움직이며 이해하고 기록합니다.`
- 우측 상단의 `[SKIP TO INDEX]`는 모든 진행 구간에서 실제 링크로 유지한다.

### 4. Dissolution — 0.56–0.80

- WebGL 곡면의 선과 점이 흐려지면서 동일한 투영 위치를 연상시키는 ASCII 문자층이 나타난다.
- 문자는 `. · + / # %`의 밀도 순서로 구성하고, 유체장과 포인터의 영향을 받는다.
- `STATISTICS`, `MACHINE LEARNING`, `AI`, `MATHEMATICS`가 완전한 메뉴가 아닌 순간적인 관측값처럼 나타났다 흩어진다.
- 단색 코발트 블루는 현재 움직임의 초점과 한 개의 추적점에만 사용한다.

### 5. Reconstruction — 0.80–1.00

- ASCII 흐름의 속도가 줄고 문자가 최대 세 개의 수평적인 최신 글 행 주변으로 정렬된다.
- 최신 글은 제목, 날짜, 카테고리, 짧은 설명을 가지며 행 전체가 실제 링크다. 현재처럼 공개 글이 하나뿐이면 빈 가짜 행을 만들지 않는다.
- 마지막에 `[ENTER THE ARCHIVE →]`, 전체 공개 글 개수, 최근 갱신일이 나타난다.
- 고정 구간이 끝나면 같은 게시글 영역이 정상 문서 흐름 안에서 이어지며 스크롤 트랩을 만들지 않는다.

## 시각 체계

홈은 기존 전역 토큰을 변경하지 않고 홈 전용 토큰을 추가한다.

- 배경: `#0a0a0a`
- 기본 글자: `#efede6`
- 보조 글자: `#777777`
- 홈 강조색: `#5b7cfa`
- 큰 제목: 로컬 우선 세리프 스택
- 좌표, 상태, 날짜, 링크: 기존 모노스페이스 스택
- 그림자, 둥근 카드, pill, 반복적인 테두리는 사용하지 않는다.
- 홈의 계층은 여백, 글자 크기, 투명도, 문자 밀도, 깊이로 만든다.
- 헤더와 큰 장면 전환에 필요한 선 이외에는 구조적 구분선을 두지 않는다.

기존 cyan/red/yellow/violet 토큰은 게시글 학습 장면을 위해 유지한다. 코발트 블루는 홈 경험에만 적용한다.

## 페이지 구성

### 홈 전용 크롬

`BaseLayout`은 기본 페이지 동작을 유지하면서 선택적인 홈 variant를 받는다. 홈 variant에서는 최대 폭과 좌우 테두리를 제거하고, 헤더를 투명한 오버레이로 표현한다. 아카이브와 게시글 페이지의 기존 프레임에는 영향을 주지 않는다.

헤더에는 워드마크, `[INDEX]`, `[ARCHIVE]`만 남긴다. 별도의 About 라우트는 추가하지 않는다. 홈에서 `[INDEX]`는 장면 종료 지점으로 이동하고, JavaScript가 없어도 동일한 fragment 링크로 동작한다. `[ARCHIVE]`는 기존 `/posts/` 경로를 유지한다.

### 정적 콘텐츠

제목, 설명, 최신 글 3개, 아카이브 링크는 Astro가 빌드 시 HTML로 생성한다. `getPublishedPosts()`가 현재와 동일하게 데이터 원천이며, 홈을 위해 별도의 콘텐츠 파일이나 CMS를 만들지 않는다.

기존 정적 `site-hero` ASCII 자산은 삭제하지 않지만 홈에서는 사용하지 않는다. 다른 fallback이나 향후 페이지에서 재사용할 수 있도록 registry에 보존한다.

## 기술 구조

### 컴포넌트 경계

```text
src/components/home/
  HomeScrollytelling.astro       정적 구조, 제목, 글 목록, fallback
  HomeManimScene.tsx             WebGL 컨테이너와 lifecycle 연결

src/scrollytelling/
  ScrollSceneController.ts       재사용 진행률 계약
  ScrollProgressDriver.ts        GSAP ScrollTrigger와 DOM 상태 연결
  home/
    HomeTopologyController.ts    manim-web 3D 장면
    HomeAsciiField.ts            ASCII Canvas 장면
    homeTimeline.ts              진행률 구간과 보간 함수

src/styles/
  home-scrollytelling.css        홈 전용 레이아웃과 장면 스타일
```

구현 중 파일명이 기존 관례와 충돌할 경우 위치는 조정할 수 있지만 각 모듈의 책임은 합치지 않는다.

### 재사용 계약

```ts
export interface ScrollSceneController {
  setProgress(progress: number): void;
  resize(width: number, height: number, pixelRatio: number): void;
  dispose(): void;
}
```

- `setProgress`는 0–1 범위를 clamp하고 같은 값에 대한 결과가 결정적이어야 한다.
- 시간 경과가 아니라 진행률이 장면 상태의 유일한 기준이다.
- `resize`는 기존 장면 상태를 재생성하지 않고 투영과 렌더 크기만 갱신한다.
- `dispose`는 animation frame, observer, ScrollTrigger, WebGL, Canvas 리소스를 한 번만 정리한다.

향후 학습 자료와 포트폴리오 장면은 이 계약을 구현한다. Markdown에는 React·Astro·Manim 코드를 넣지 않으며 기존 시각화 manifest와 같은 별도 등록 방식을 사용한다.

### 진행률 데이터 흐름

1. GSAP ScrollTrigger가 홈 고정 구간의 진행률을 계산한다.
2. `ScrollProgressDriver`가 한 animation frame당 최대 한 번 최신 진행률을 배포한다.
3. `HomeTopologyController`가 Manim mobject와 카메라를 갱신한다.
4. `HomeAsciiField`가 문자 위치와 밀도를 같은 진행률로 갱신한다.
5. CSS custom property와 작은 DOM 상태 함수가 제목·라벨·게시글의 opacity와 transform을 갱신한다.
6. 역방향 스크롤은 동일한 함수에 감소한 진행률을 전달하므로 별도 reverse animation을 실행하지 않는다.

### manim-web 장면

- 홈 장면은 기존 2D `ResponsiveManimScene`을 억지로 확장하지 않고 `ThreeDScene` 전용 lifecycle wrapper를 사용한다.
- `Surface3D`는 데스크톱에서 최대 18×18, 모바일에서 최대 12×12 해상도로 시작한다.
- 곡면 변형은 `Surface3D.setFunc()`를 animation frame 단위로 제한해 호출한다.
- 카메라는 진행률로 계산한 값으로 직접 설정하고 사용자 orbit control은 비활성화한다.
- 마우스·터치는 곡면 함수의 작은 국소 편향만 제공하며 키보드나 스크롤 진행을 방해하지 않는다.
- `manim-web` 로드와 장면 초기화는 홈 전용 동적 import로 수행한다.

## 반응형 동작

### Desktop, 1024px 이상

- 전체 3D 곡면과 ASCII 밀도를 사용한다.
- 제목은 화면 중심에서 약간 왼쪽에 배치하고 곡면의 빈 공간과 겹친다.
- 최신 글은 넓은 수평 행으로 재조립된다.

### Tablet, 640–1023px

- 곡면 해상도와 ASCII 열 수를 줄인다.
- 카메라 이동 폭을 줄여 제목과 겹침을 방지한다.
- 최신 글 설명은 두 줄로 제한한다.

### Mobile, 639px 이하

- 고정 구간은 약 `220vh`로 줄인다.
- 저해상도 와이어프레임과 적은 ASCII 문자만 사용한다.
- 포인터 기반 변형은 터치 위치의 짧은 자극으로 대체한다.
- 게시글 행은 단일 열이며 제목과 날짜를 먼저 보여준다.
- 390px에서 페이지 수준 수평 overflow가 없어야 한다.

## 접근성과 fallback

- 스킵 링크는 문서의 첫 포커스 가능 요소로 유지한다.
- WebGL과 ASCII Canvas는 장식으로 `aria-hidden` 처리하고, 장면의 의미는 제목과 설명 텍스트가 전달한다.
- 최신 글과 아카이브 이동은 실제 anchor로 렌더한다.
- hover 변화에는 동일한 `:focus-visible` 상태를 제공한다.
- `prefers-reduced-motion: reduce`에서는 긴 pin을 제거하고 정적인 Topology 상태, 제목, 최신 글을 한 화면 흐름으로 보여준다.
- WebGL을 만들 수 없거나 context가 손실되면 정적인 ASCII 배경으로 전환하고 콘텐츠를 그대로 유지한다.
- Canvas 초기화가 실패하면 장식층만 숨긴다. 사용자에게 재시도를 요구하거나 콘텐츠를 가리지 않는다.
- JavaScript가 비활성화되어도 제목, 설명, 최신 글, 아카이브 링크가 정상 순서로 보인다.

## 성능 원칙

- `manim-web`, GSAP, 홈 ASCII 코드는 홈 라우트에서만 로드한다.
- device pixel ratio는 데스크톱 1.75, 모바일 1.25를 상한으로 둔다.
- 스크롤·포인터 이벤트에서 직접 렌더하지 않고 animation frame에 합친다.
- 곡면이 완전히 사라진 구간에는 geometry를 갱신하지 않는다.
- 홈 장면이 viewport를 벗어나거나 문서가 hidden 상태면 연속 렌더링을 중지한다.
- 모바일은 시각 품질보다 안정적인 30fps와 입력 응답을 우선한다.
- 다른 라우트의 기존 `manim-web` 지연 로딩과 정적 HTML 번들 특성은 유지한다.

## 테스트 전략

### 단위 테스트

- 진행률 clamp와 각 장면 구간의 보간값
- 동일 진행률의 결정적 상태
- 역방향 진행률 갱신
- 한 animation frame당 한 번만 배포하는 progress driver
- topology controller의 resize와 idempotent dispose
- ASCII field의 밀도·문자 선택·모바일 상한
- WebGL 초기화 실패와 context loss fallback

### Playwright

- 홈에 제목, 설명, 존재하는 최신 글이 최대 3개 표시되고 `[SKIP TO INDEX]`, `[ENTER THE ARCHIVE →]`가 실제 링크로 존재한다.
- 진행률 시작·중간·끝에서 각 장면 상태 marker가 정확하다.
- 역방향 스크롤 후 시작 상태로 돌아온다.
- 최신 글 행 전체를 포인터와 키보드로 열 수 있다.
- 390px, 768px, 1440px에서 수평 overflow가 없다.
- reduced motion에서는 pin이 제거되고 콘텐츠가 즉시 보인다.
- JavaScript 장면 실패를 강제해도 정적 콘텐츠와 링크가 남는다.
- 홈 이외의 대표 라우트가 홈 장면 chunk를 요청하지 않는다.

### 전체 검증

다음 명령을 순서대로 실행한다.

```bash
npm run check
npm test
npm run build
npm run test:e2e
```

Astro check와 build는 동일한 생성 산출물에 접근하므로 병렬 실행하지 않는다.

## 이슈 #5와의 관계

열린 이슈 #5의 홈 관련 요구인 외곽선, 히어로 세로선, 반복 게시글 행 구분선, 주제 카드 격자 제거는 이번 홈 교체가 충족한다. 그러나 이슈 #5는 게시글·아카이브·토픽 페이지의 선 축소 작업도 포함하므로 이번 변경으로 닫지 않는다.

## 제외 범위

- 기존 선형회귀 글을 스크롤텔링으로 변환
- 포트폴리오 라우트 또는 프로젝트 데이터 모델 추가
- Markdown 작성 규칙 변경
- 아카이브·토픽·게시글 내부 재디자인
- `manim-web` 라이브러리 자체 수정 또는 포크
- CMS, 서버, 데이터베이스, 사용자 계정 추가
- 새 원격 폰트와 외부 이미지 에셋 추가

## 구현과 배포

작업은 `codex/home-scrollytelling` 브랜치에서 테스트 우선으로 진행한다. 설계 승인 후 별도 구현 계획을 작성하고, 작은 검증 단위로 구현한다. 전체 검증이 통과하면 draft pull request를 연다. `main` 병합과 GitHub Pages 실제 배포는 자동으로 수행하지 않고 사용자 검토 뒤에 남긴다.
