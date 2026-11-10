// The /api routes, served by Vite's dev server. See specs/stack.md#api.
//
//   GET /api/deltas                  DeltaList
//   GET /api/deltas/:id              DeltaOverview
//   GET /api/deltas/:id/:category    CategoryDiff
//   PUT /api/focus/:id               body {"focus": "pinned" | "normal" | "muted"}
//
// Ids contain "/" and ":", so they're URL-encoded. The server is long-lived:
// it remembers how to re-read each delta from the last listing, but every
// request reads git fresh, so what you see is always the current state.

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import type { CategoryDiff, DeltaId, DeltaList, DeltaOverview, DeltaSummary, Focus } from '../types.ts';
import { sectionOrder } from '../shared/classify.ts';
import { buildOverview, categoryDiff, categoryStats } from '../shared/overview.ts';
import { categoryConfig, setFocus, state } from './config.ts';
import { inspect, localDelta, plan, prOnlyDelta, scan, unavailableDelta, type LocalDelta } from './discover.ts';
import { openPrs, type OpenPr } from './prs.ts';
import { fileChange, fileStats } from './sources/git.ts';

// How to re-read each delta from the last listing.
let readers = new Map<DeltaId, () => Promise<LocalDelta | string | null>>();

async function deltas(): Promise<DeltaList> {
  const s = state();
  const config = categoryConfig();
  const warnings: string[] = [];
  const [checkouts, prs] = await Promise.all([
    scan(s.scanRoots),
    openPrs().catch((e: Error & { stderr?: string }): OpenPr[] => {
      warnings.push(`Couldn't load your PRs, so only local checkouts are shown: ${(e.stderr || e.message).trim()}`);
      return [];
    }),
  ]);

  const next = new Map<DeltaId, () => Promise<LocalDelta | string | null>>();
  const results = await Promise.all(
    plan(checkouts, prs).map(async (p): Promise<DeltaSummary | null> => {
      if (p.kind === 'unavailable') {
        return { delta: unavailableDelta(p.pr), focus: 'normal', categories: [], unavailable: p.reason };
      }
      // The listing reuses the checkout it just scanned; later re-reads inspect it again.
      let scanned: typeof p | null = p;
      const read =
        p.kind === 'local'
          ? async () => {
              const co = scanned?.kind === 'local' ? scanned.checkout : await inspect(p.checkout.top);
              scanned = null;
              return localDelta(co, config, p.pr);
            }
          : () => prOnlyDelta(p.pr, p.clone, config);
      const d = await read().catch((e: Error) => e.message);
      if (d === null) return null;
      if (typeof d === 'string') {
        const pr = p.kind === 'pr' ? p.pr : p.pr!;
        return { delta: unavailableDelta(pr), focus: 'normal', categories: [], unavailable: d };
      }
      next.set(d.delta.id, read);
      return { delta: d.delta, focus: s.focus[d.delta.id] ?? 'normal', categories: categoryStats(d.stats, sectionOrder(d.globs)) };
    }),
  );
  readers = next;

  const updated = (d: DeltaSummary) => [d.delta.local?.updatedAt ?? '', d.delta.pr?.updatedAt ?? ''].sort().pop()!;
  const list = results.filter((d): d is DeltaSummary => d !== null);
  // Openable deltas first, newest first; then the ones that can't be opened.
  list.sort((a, b) => Number(!!a.unavailable) - Number(!!b.unavailable) || updated(b).localeCompare(updated(a)));
  return { deltas: list, warnings };
}

// Re-reads one delta, so it reflects edits made since the last listing.
async function fresh(id: DeltaId): Promise<LocalDelta> {
  if (!readers.has(id)) await deltas();
  const read = readers.get(id);
  if (!read) throw new HttpError(404, `It isn't in your checkouts or open PRs any more. Maybe it was merged, or its checkout moved to another branch.`);
  const d = await read();
  if (d === null) throw new HttpError(404, `It has no changes any more. Maybe it was merged.`);
  if (typeof d === 'string') throw new HttpError(503, d);
  return d;
}

async function overview(id: DeltaId): Promise<DeltaOverview> {
  const d = await fresh(id);
  return { ...buildOverview(d.delta, d.stats, sectionOrder(d.globs)), focus: state().focus[id] ?? 'normal' };
}

const FOCUSES: Focus[] = ['pinned', 'normal', 'muted'];

async function focus(id: DeltaId, req: IncomingMessage): Promise<{ id: DeltaId; focus: Focus }> {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  const f = (JSON.parse(raw || '{}') as { focus?: unknown }).focus;
  if (!FOCUSES.includes(f as Focus)) throw new HttpError(400, `focus must be one of ${FOCUSES.join(', ')}`);
  setFocus(id, f as Focus);
  return { id, focus: f as Focus };
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
    if (req.method === 'PUT' && parts[0] === 'focus' && parts.length === 2) body = await focus(parts[1]!, req);
    else if (req.method !== 'GET' || parts[0] !== 'deltas' || parts.length > 3) throw new HttpError(404, `No route ${req.method} ${path}`);
    else if (parts.length === 1) body = await deltas();
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
