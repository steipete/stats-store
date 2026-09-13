export function parseGitHubRepository(value: string) {
  let url: URL;
  try {
    url = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password
  )
    return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const [owner, repository] = parts;
  const repo = repository?.replace(/\.git$/, "");
  return owner && repo ? { owner, repo, isRoot: parts.length === 2 } : null;
}
