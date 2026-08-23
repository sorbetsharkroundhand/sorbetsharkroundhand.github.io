import {
  POSTS_CONTENT_PATH,
  STUDIO_ALLOWED_LOGINS,
} from '../../config/studio';

const API_ROOT = 'https://api.github.com';

export interface GitHubSession {
  avatarUrl: string;
  login: string;
}

export interface GitHubError extends Error {
  status?: number;
}

function apiHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function request(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(`${API_ROOT}/${path}`, {
    ...init,
    headers: { ...apiHeaders(token), ...init?.headers },
  });
  return response;
}

function failure(status: number, fallback: string): GitHubError {
  const error: GitHubError = new Error(fallback);
  error.status = status;
  return error;
}

export async function verifyToken(
  token: string,
): Promise<GitHubSession> {
  if (!token.trim()) throw failure(0, '토큰을 입력하세요.');
  const response = await request('user', token.trim());
  if (response.status === 401) throw failure(401, 'GitHub가 토큰을 거부했습니다. 만료되었거나 잘못된 토큰입니다.');
  if (!response.ok) throw failure(response.status, `GitHub 확인에 실패했습니다. (${response.status})`);
  const user = (await response.json()) as { avatar_url?: string; login?: string };
  if (!user.login) throw failure(0, 'GitHub 계정 정보를 읽지 못했습니다.');
  return { avatarUrl: user.avatar_url ?? '', login: user.login };
}

export function isAllowedLogin(login: string): boolean {
  return STUDIO_ALLOWED_LOGINS.includes(login);
}

export async function listPostSlugs(token: string): Promise<string[]> {
  const response = await request(`contents/${POSTS_CONTENT_PATH}`, token);
  if (!response.ok) throw failure(response.status, '기존 노트 목록을 불러오지 못했습니다.');
  const entries = (await response.json()) as Array<{ name: string }>;
  return entries
    .map((entry) => entry.name)
    .filter((name) => name.endsWith('.md'))
    .map((name) => name.slice(0, -3));
}

export interface ExistingFile {
  sha: string;
}

export async function findPostFile(
  token: string,
  slug: string,
): Promise<ExistingFile | null> {
  const response = await request(`contents/${POSTS_CONTENT_PATH}/${slug}.md`, token);
  if (response.status === 404) return null;
  if (!response.ok) throw failure(response.status, '파일 상태를 확인하지 못했습니다.');
  const file = (await response.json()) as { sha?: string };
  if (!file.sha) throw failure(0, '파일 식별자(sha)를 읽지 못했습니다.');
  return { sha: file.sha };
}

export function encodeContent(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function putPostFile(options: {
  body: string;
  commitMessage: string;
  sha?: string;
  slug: string;
  token: string;
}): Promise<void> {
  const { body, commitMessage, sha, slug, token } = options;
  const payload: Record<string, unknown> = {
    content: encodeContent(body),
    message: commitMessage,
  };
  if (sha) payload.sha = sha;
  const response = await request(`contents/${POSTS_CONTENT_PATH}/${slug}.md`, token, {
    body: JSON.stringify(payload),
    method: 'PUT',
  });
  if (!response.ok) {
    throw failure(response.status, `발행에 실패했습니다. (${response.status})`);
  }
}
