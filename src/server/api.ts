// The /api routes, served by Vite's dev server. See specs/stack.md#api.
//
//   GET /api/deltas                  DeltaSummary[]
//   GET /api/deltas/:id              DeltaOverview
//   GET /api/deltas/:id/:category    CategoryDiff
//
// Ids contain "/" and ":", so they're URL-encoded. The server is long-lived:
// it remembers the last discovery so a delta can be looked up by id, but every
// request reads git fresh, so what you see is always the current state.

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import type { CategoryDiff, DeltaId, DeltaOverview, DeltaSummary } from '../types.ts';
import { sectionOrder } from '../shared/classify.ts';
import { buildOverview, categoryDiff, categoryStats } from '../shared/overview.ts';
import { categoryConfig, state } from './config.ts';
import { discoverLocal, localDelta, type LocalDelta } from './discover.ts';
import { fileChange, fileStats } from './sources/git.ts';

let known = new Map<DeltaId, LocalDelta>();

async function deltas(): Promise<DeltaSummary[]> {
  const s = state();
  const found = await discoverLocal(s.scanRoots, categoryConfig());
  known = new Map(found.map((d) => [d.delta.id, d]));
  return found
    .map((d) => ({
      delta: d.delta,
      focus: s.focus[d.delta.id] ?? 'normal',
      categories: categoryStats(d.stats, sectionOrder(d.globs)),
    }))
    .sort((a, b) => (b.delta.local?.updatedAt ?? '').localeCompare(a.delta.local?.updatedAt ?? ''));
}

// Re-reads one delta, so it reflects edits made since the last discovery.
async function fresh(id: DeltaId): Promise<LocalDelta> {
  if (!known.has(id)) await deltas();
  const d = known.get(id);
  if (!d) throw new HttpError(404, `No delta ${id}`);
  const again = await localDelta(d.range.cwd, categoryConfig());
  if (!again || again.delta.id !== id) throw new HttpError(404, `${id} has no changes any more`);
  known.set(id, again);
  return again;
}

async function overview(id: DeltaId): Promise<DeltaOverview> {
  const d = await fresh(id);
  return buildOverview(d.delta, d.stats, sectionOrder(d.globs));
}

async function diff(id: DeltaId, category: string): Promise<CategoryDiff> {
  const d = await fresh(id);
  const stats = await fileStats(d.range, d.globs);
  const files = await Promise.all(stats.filter((f) => f.category === category).map((f) => fileChange(d.range, f)));
  return categoryDiff(id, category, files);
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Mounted at /api, so req.url is the rest: /deltas, /deltas/<id>, /deltas/<id>/<category>
  const path = (req.url ?? '/').split('?')[0]!;
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  let body: unknown;
  try {
    if (req.method !== 'GET' || parts[0] !== 'deltas' || parts.length > 3) throw new HttpError(404, `No route ${path}`);
    if (parts.length === 1) body = await deltas();
    else if (parts.length === 2) body = await overview(parts[1]!);
    else body = await diff(parts[1]!, parts[2]!);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
  } catch (e) {
    res.statusCode = e instanceof HttpError ? e.status : 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }));
  }
}

export function pridmApi(): Plugin {
  return {
    name: 'pridm-api',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => void handle(req, res));
    },
  };
}
