import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SITE_REPO } from '../../config/site';
import {
  CATEGORIES,
  SESSION_STORAGE_KEY,
  type PostCategory,
} from '../../config/studio';
import {
  composePostFile,
  hasErrors,
  parseTopics,
  slugify,
  validateDraft,
  type PostDraft,
} from '../../lib/studio/frontmatter';
import {
  findPostFile,
  isAllowedLogin,
  listPostSlugs,
  putPostFile,
  verifyToken,
  type GitHubSession,
} from '../../lib/studio/github';
import { renderPreview } from '../../lib/studio/renderPreview';
import { withBase } from '../../utils/urls';
import './studio.css';

type Phase = 'checking' | 'gate' | 'ready';

interface PublishedInfo {
  slug: string;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_DRAFT: PostDraft = {
  category: '',
  description: '',
  draft: false,
  publishedAt: todayISO(),
  slug: '',
  subtitle: '',
  title: '',
  topics: [],
};

export default function StudioApp() {
  const [phase, setPhase] = useState<Phase>('checking');
  const [session, setSession] = useState<GitHubSession | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);

  const [draft, setDraft] = useState<PostDraft>(EMPTY_DRAFT);
  const [topicsInput, setTopicsInput] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof validateDraft>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const [existingSlugs, setExistingSlugs] = useState<string[]>([]);
  const [pendingSha, setPendingSha] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [published, setPublished] = useState<PublishedInfo | null>(null);
  const tokenRef = useRef('');

  const slugFromTitle = useMemo(() => slugify(draft.title), [draft.title]);
  const effectiveSlug = draft.slug || slugFromTitle;

  useEffect(() => {
    let cancelled = false;
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) {
      setPhase('gate');
      return;
    }
    verifyToken(stored)
      .then((next) => {
        if (cancelled) return;
        if (!isAllowedLogin(next.login)) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setGateError(`이 계정(${next.login})에는 발행 권한이 없습니다.`);
          setPhase('gate');
          return;
        }
        tokenRef.current = stored;
        setSession(next);
        setPhase('ready');
      })
      .catch(() => {
        if (!cancelled) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setPhase('gate');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== 'ready') return;
    let cancelled = false;
    listPostSlugs(tokenRef.current)
      .then((slugs) => {
        if (!cancelled) setExistingSlugs(slugs);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [phase]);

  useEffect(() => {
    if (!showPreview) return;
    let cancelled = false;
    renderPreview(body).then((html) => {
      if (!cancelled) setPreviewHtml(html);
    });
    return () => {
      cancelled = true;
    };
  }, [body, showPreview]);

  const handleLogin = useCallback(async () => {
    setGateError(null);
    try {
      const next = await verifyToken(tokenInput);
      if (!isAllowedLogin(next.login)) {
        setGateError(
          `이 계정(${next.login})에는 발행 권한이 없습니다. 관리자 계정으로 로그인하세요.`,
        );
        return;
      }
      sessionStorage.setItem(SESSION_STORAGE_KEY, tokenInput.trim());
      tokenRef.current = tokenInput.trim();
      setTokenInput('');
      setSession(next);
      setPhase('ready');
    } catch (error) {
      setGateError(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    }
  }, [tokenInput]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    tokenRef.current = '';
    setSession(null);
    setPublished(null);
    setPhase('gate');
  }, []);

  const patchDraft = (patch: Partial<PostDraft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const handleTopicsChange = (input: string) => {
    setTopicsInput(input);
    patchDraft({ topics: parseTopics(input) });
  };

  const duplicateSlug = existingSlugs.includes(effectiveSlug);

  const handlePublish = useCallback(async () => {
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    setPublishError(null);
    if (hasErrors(nextErrors)) return;

    setPublishing(true);
    try {
      const existing = await findPostFile(tokenRef.current, effectiveSlug);
      if (existing && !pendingSha) {
        setPendingSha(existing.sha);
        setPublishing(false);
        return;
      }
      const file = composePostFile({ ...draft, slug: effectiveSlug }, body);
      const verb = pendingSha ? 'update' : 'add';
      const label = draft.draft ? 'notes(draft)' : 'notes';
      await putPostFile({
        body: file,
        commitMessage: `${label}: ${verb} ${effectiveSlug}`,
        sha: pendingSha ?? undefined,
        slug: effectiveSlug,
        token: tokenRef.current,
      });
      setPublished({ slug: effectiveSlug });
      setPendingSha(null);
      setExistingSlugs((slugs) =>
        slugs.includes(effectiveSlug) ? slugs : [...slugs, effectiveSlug],
      );
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : '발행에 실패했습니다.');
    } finally {
      setPublishing(false);
    }
  }, [body, draft, effectiveSlug, pendingSha]);

  const handleDownload = useCallback(() => {
    const file = composePostFile({ ...draft, slug: effectiveSlug }, body);
    const blob = new Blob([file], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${effectiveSlug || 'note'}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [body, draft, effectiveSlug]);

  if (phase === 'checking') {
    return (
      <div className="studio studio--center">
        <p className="studio__hint">세션을 확인하는 중입니다.</p>
      </div>
    );
  }

  if (phase === 'gate') {
    return (
      <div className="studio studio--narrow">
        <p className="mechanical-label">
          <span aria-hidden="true">GH::</span>STUDIO LOGIN
        </p>
        <h1 className="studio__title">노트 스튜디오</h1>
        <p className="studio__lead">
          GitHub 계정으로 신원을 확인한 뒤 이 저장소에 노트를 직접 발행합니다.
          토큰은 이 탭의 세션 저장소에만 머무르고 어느 서버로도 전송되지 않습니다.
        </p>
        <form
          className="studio__login"
          onSubmit={(event) => {
            event.preventDefault();
            void handleLogin();
          }}
        >
          <label className="studio-field">
            <span className="studio-field__label">
              GitHub personal access token (fine-grained)
            </span>
            <input
              autoComplete="off"
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="github_pat_…"
              required
              spellCheck={false}
              type="password"
              value={tokenInput}
            />
          </label>
          {gateError && (
            <p className="studio__error" role="alert">
              {gateError}
            </p>
          )}
          <button className="studio-button studio-button--primary" type="submit">
            GitHub로 확인하고 열기
          </button>
        </form>
        <div className="studio__guide">
          <p>토큰 준비 방법:</p>
          <ol>
            <li>GitHub → Settings → Developer settings → Fine-grained tokens</li>
            <li>
              이 저장소만 선택하고 <strong>Contents: Read and write</strong> 권한 부여
            </li>
            <li>짧은 만료일(예: 7일)을 권장합니다.</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="studio">
      <header className="studio__bar">
        <p className="mechanical-label">
          <span aria-hidden="true">GH::</span>STUDIO
        </p>
        <div className="studio__session">
          {session?.avatarUrl && (
            <img
              alt=""
              className="studio__avatar"
              height={24}
              src={session.avatarUrl}
              width={24}
            />
          )}
          <span>{session?.login}</span>
          <button
            className="studio-button studio-button--ghost"
            onClick={handleLogout}
            type="button"
          >
            로그아웃
          </button>
        </div>
      </header>

      {published ? (
        <section aria-live="polite" className="studio__done">
          <h2 className="studio__title">발행했습니다.</h2>
          <p className="studio__lead">
            <code>{published.slug}.md</code> 커밋이 푸시되었습니다. 배포가 끝나면 노트가
            공개됩니다.
          </p>
          <div className="studio__actions-row">
            <a
              className="studio-button studio-button--primary"
              href={`https://github.com/${SITE_REPO.owner}/${SITE_REPO.name}/actions`}
              rel="noreferrer"
              target="_blank"
            >
              배포 진행 보기
            </a>
            <a className="studio-button" href={withBase(`posts/${published.slug}/`)}>
              노트 페이지 열기
            </a>
            <button
              className="studio-button studio-button--ghost"
              onClick={() => {
                setPublished(null);
                setDraft(EMPTY_DRAFT);
                setTopicsInput('');
                setBody('');
                setErrors({});
                setPendingSha(null);
              }}
              type="button"
            >
              새 노트 쓰기
            </button>
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="studio-meta-title" className="studio__panel">
            <h2 className="studio-panel-title" id="studio-meta-title">
              01::FRONTMATTER
            </h2>
            <div className="studio-grid">
              <label className="studio-field studio-field--wide">
                <span className="studio-field__label">제목</span>
                <input
                  onChange={(event) => patchDraft({ title: event.target.value })}
                  value={draft.title}
                />
                {errors.title && <span className="studio__error">{errors.title}</span>}
              </label>
              <label className="studio-field">
                <span className="studio-field__label">슬러그</span>
                <input
                  onChange={(event) => patchDraft({ slug: slugify(event.target.value) })}
                  placeholder={slugFromTitle || 'linear-regression'}
                  spellCheck={false}
                  value={draft.slug}
                />
                {!draft.slug && slugFromTitle && (
                  <span className="studio-field__hint">제목에서 자동 생성: {slugFromTitle}</span>
                )}
                {duplicateSlug && (
                  <span className="studio-field__hint studio-field__hint--warn">
                    같은 슬러그의 노트가 있습니다. 저장하면 덮어씁니다.
                  </span>
                )}
                {errors.slug && <span className="studio__error">{errors.slug}</span>}
              </label>
              <label className="studio-field">
                <span className="studio-field__label">부제</span>
                <input
                  onChange={(event) => patchDraft({ subtitle: event.target.value })}
                  value={draft.subtitle}
                />
                {errors.subtitle && <span className="studio__error">{errors.subtitle}</span>}
              </label>
              <label className="studio-field">
                <span className="studio-field__label">설명 (목록 카드에 표시)</span>
                <input
                  onChange={(event) => patchDraft({ description: event.target.value })}
                  value={draft.description}
                />
                {errors.description && (
                  <span className="studio__error">{errors.description}</span>
                )}
              </label>
              <label className="studio-field">
                <span className="studio-field__label">분류</span>
                <select
                  onChange={(event) =>
                    patchDraft({ category: event.target.value as PostCategory })
                  }
                  value={draft.category}
                >
                  <option value="">선택하세요</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && <span className="studio__error">{errors.category}</span>}
              </label>
              <label className="studio-field">
                <span className="studio-field__label">주제 (쉼표 구분)</span>
                <input
                  onChange={(event) => handleTopicsChange(event.target.value)}
                  placeholder="linear-regression, least-squares"
                  spellCheck={false}
                  value={topicsInput}
                />
                {errors.topics && <span className="studio__error">{errors.topics}</span>}
              </label>
              <label className="studio-field">
                <span className="studio-field__label">발행일</span>
                <input
                  onChange={(event) => patchDraft({ publishedAt: event.target.value })}
                  type="date"
                  value={draft.publishedAt}
                />
                {errors.publishedAt && (
                  <span className="studio__error">{errors.publishedAt}</span>
                )}
              </label>
              <label className="studio-check">
                <input
                  checked={draft.draft}
                  onChange={(event) => patchDraft({ draft: event.target.checked })}
                  type="checkbox"
                />
                <span>초안으로 저장 (사이트에 공개되지 않습니다)</span>
              </label>
            </div>
          </section>

          <section aria-labelledby="studio-body-title" className="studio__panel">
            <div className="studio-panel-head">
              <h2 className="studio-panel-title" id="studio-body-title">02::BODY</h2>
              <button
                className="studio-button studio-button--ghost"
                onClick={() => setShowPreview((value) => !value)}
                type="button"
              >
                {showPreview ? '[미리보기 닫기]' : '[미리보기]'}
              </button>
            </div>
            <textarea
              className="studio-body"
              onChange={(event) => setBody(event.target.value)}
              placeholder={
                '## 데이터에서 직선 찾기\n\n관찰값을 하나의 직선으로 요약해 봅니다.\n\n$$\n\\hat{y} = wx + b\n$$'
              }
              rows={18}
              spellCheck={false}
              value={body}
            />
            <p className="studio-field__hint">
              일반 Markdown과 $...$ · $$...$$ 수식을 지원합니다. 컴포넌트와 HTML은 넣지
              마세요.
            </p>
            {showPreview && (
              <div
                className="studio-preview article-prose"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </section>

          {pendingSha && (
            <p className="studio__warn" role="alert">
              이미 존재하는 노트입니다. 다시 누르면{' '}
              <strong>{effectiveSlug}.md</strong>를 덮어씁니다.
            </p>
          )}
          {publishError && (
            <p className="studio__error" role="alert">
              {publishError}
            </p>
          )}

          <div className="studio__actions-row">
            <button
              className="studio-button studio-button--primary"
              disabled={publishing}
              onClick={() => void handlePublish()}
              type="button"
            >
              {pendingSha ? '덮어쓰고 발행하기' : draft.draft ? '초안 커밋하기' : '발행하기'}
            </button>
            <button className="studio-button" onClick={handleDownload} type="button">
              .md 내려받기
            </button>
          </div>
        </>
      )}
    </div>
  );
}
