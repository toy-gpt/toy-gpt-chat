// src/services/githubRaw.ts

/**
 * Build a raw.githubusercontent.com URL for a file in a GitHub repo.
 *
 * @param repo   e.g. "toy-gpt/train-100-unigram-animals"
 * @param branch e.g. "main"
 * @param path   e.g. "artifacts/00_meta.json"
 */
export function toRawGitHubUrl(
  repo: string,
  branch: string,
  path: string
): string {
  const cleanPath = path.replace(/^\/+/, '');
  return `https://raw.githubusercontent.com/${repo}/${branch}/${cleanPath}`;
}
