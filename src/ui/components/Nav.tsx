import { SyncIcon } from '@primer/octicons-react';
import { routeHash } from '../route.ts';

// The bar across the top of every page: the logo, which goes back to the
// dashboard, then where you are, then the page's own controls on the right.
// A crumb with an href is a link; the last one is the page you're on.
export interface Crumb {
  label: string;
  href?: string;
}

export interface NavProps {
  crumbs?: Crumb[];
  children?: React.ReactNode;
}

export function Nav({ crumbs = [], children }: NavProps) {
  return (
    <nav className="pridm-nav">
      <a href={routeHash({ page: 'dashboard' })} className="pridm-logo">
        priδm
      </a>
      {crumbs.map((c, i) => (
        <span key={i} className="pridm-crumb" aria-current={i === crumbs.length - 1 ? 'page' : undefined}>
          <span className="pridm-muted">/</span>
          {c.href ? <a href={c.href}>{c.label}</a> : c.label}
        </span>
      ))}
      {children && <div className="pridm-nav-actions">{children}</div>}
    </nav>
  );
}

export function RefreshButton({ onRefresh, refreshing = false }: { onRefresh: () => void; refreshing?: boolean }) {
  return (
    <button type="button" className="pridm-refresh" onClick={onRefresh} disabled={refreshing} title="Look through your checkouts and PRs again">
      <SyncIcon size={14} className={refreshing ? 'pridm-spin' : undefined} />
      {refreshing ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}

// "github.com/diffplug/pridm" -> "diffplug/pridm"
export const repoName = (repo: string) => repo.replace(/^github\.com\//, '');
