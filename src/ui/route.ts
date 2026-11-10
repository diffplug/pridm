// Hash routing:
//   #/                                the dashboard
//   #/project/<repo>                  the dashboard, with only that project's deltas
//   #/delta/<id>?open=spec,test       one delta, with those categories open
// Keeping open categories in the URL means a reload or a shared link keeps them.

import { useEffect, useState } from 'react';
import type { Category, DeltaId, RepoKey } from '../types.ts';

export type Route = { page: 'dashboard'; repo?: RepoKey } | { page: 'delta'; id: DeltaId; open: Category[] };

export function parseRoute(hash: string): Route {
  const project = /^#\/project\/([^?]+)/.exec(hash);
  if (project) return { page: 'dashboard', repo: decodeURIComponent(project[1]!) };
  const m = /^#\/delta\/([^?]+)(?:\?(.*))?$/.exec(hash);
  if (!m) return { page: 'dashboard' };
  const open = new URLSearchParams(m[2] ?? '').get('open');
  return { page: 'delta', id: decodeURIComponent(m[1]!), open: open ? open.split(',').filter(Boolean) : [] };
}

export function routeHash(route: Route): string {
  if (route.page === 'dashboard') return route.repo ? `#/project/${encodeURIComponent(route.repo)}` : '#/';
  const open = route.open.length ? `?open=${route.open.map(encodeURIComponent).join(',')}` : '';
  return `#/delta/${encodeURIComponent(route.id)}${open}`;
}

export function useRoute(): [Route, (r: Route, replace?: boolean) => void] {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = (r: Route, replace = false) => {
    const hash = routeHash(r);
    if (replace) history.replaceState(null, '', hash);
    else history.pushState(null, '', hash);
    setRoute(r);
  };
  return [route, navigate];
}
