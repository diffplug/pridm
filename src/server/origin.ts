// Normalizes a git remote URL into a RepoKey: host + path, with no scheme,
// user, port, or ".git". See specs/architecture/model.md.
//   git@github.com:diffplug/pridm.git      -> github.com/diffplug/pridm
//   https://github.com/diffplug/pridm.git  -> github.com/diffplug/pridm
//   ssh://git@github.com:22/diffplug/pridm -> github.com/diffplug/pridm
// Returns null for a URL with no host (e.g. a local path), so the caller can
// fall back to "file:<path>".

export function normalizeOrigin(url: string): string | null {
  const u = url.trim();
  let host: string;
  let path: string;
  const scp = /^[^@/\s]+@([^:/\s]+):(?!\/\/)(.+)$/.exec(u);
  if (scp) {
    host = scp[1]!;
    path = scp[2]!;
  } else {
    try {
      const parsed = new URL(u);
      host = parsed.hostname;
      path = parsed.pathname;
    } catch {
      return null;
    }
  }
  if (!host) return null;
  path = path.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\.git$/, '');
  return path ? `${host.toLowerCase()}/${path}` : null;
}
