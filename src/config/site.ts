export const SITE_REPO = {
  owner: 'sorbetsharkroundhand',
  name: 'sorbetsharkroundhand.github.io',
} as const;

export function repositoryPath(...segments: string[]): string {
  return ['repos', SITE_REPO.owner, SITE_REPO.name, ...segments].join('/');
}
