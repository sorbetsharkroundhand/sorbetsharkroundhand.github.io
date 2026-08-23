// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  encodeContent,
  findPostFile,
  isAllowedLogin,
  listPostSlugs,
  putPostFile,
  verifyToken,
} from './github';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('verifyToken', () => {
  it('returns the GitHub identity for a valid token', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { login: 'sorbetsharkroundhand', avatar_url: 'https://x/a.png' }),
    );

    const session = await verifyToken('tok');

    expect(session).toEqual({ login: 'sorbetsharkroundhand', avatarUrl: 'https://x/a.png' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://api.github.com/user');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('translates a rejected token into a friendly error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: 'Bad credentials' }));
    await expect(verifyToken('bad')).rejects.toThrow('GitHub가 토큰을 거부했습니다.');
  });

  it('rejects empty tokens without a network call', async () => {
    await expect(verifyToken('   ')).rejects.toThrow('토큰을 입력하세요.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('allowlist', () => {
  it('only lets repository owners into the studio', () => {
    expect(isAllowedLogin('sorbetsharkroundhand')).toBe(true);
    expect(isAllowedLogin('someone-else')).toBe(false);
  });
});

describe('post file helpers', () => {
  it('lists markdown slugs from the content directory', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, [{ name: 'linear-regression.md' }, { name: 'README' }]),
    );
    expect(await listPostSlugs('tok')).toEqual(['linear-regression']);
  });

  it('treats a missing post as null and an existing one as its sha', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(404, { message: 'Not Found' }))
      .mockResolvedValueOnce(jsonResponse(200, { sha: 'abc123' }));

    expect(await findPostFile('tok', 'new-note')).toBeNull();
    expect(await findPostFile('tok', 'linear-regression')).toEqual({ sha: 'abc123' });
  });

  it('puts base64 content with the sha when overwriting', async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { commit: {} }));

    await putPostFile({
      body: '# 안녕',
      commitMessage: 'notes: add hello',
      sha: 'old-sha',
      slug: 'hello',
      token: 'tok',
    });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/contents/src/content/posts/hello.md');
    expect(init!.method).toBe('PUT');
    const payload = JSON.parse(init!.body as string);
    expect(payload.sha).toBe('old-sha');
    expect(payload.message).toBe('notes: add hello');
    expect(payload.content).toBe(encodeContent('# 안녕'));
  });
});

describe('encodeContent', () => {
  it('base64 encodes unicode text without corruption', () => {
    const decoded = new TextDecoder().decode(
      Uint8Array.from(atob(encodeContent('제목 ## ✓')), (char) => char.charCodeAt(0)),
    );
    expect(decoded).toBe('제목 ## ✓');
  });
});
