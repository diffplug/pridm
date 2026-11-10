import type { DeltaId, DeltaSummary, Focus } from '../../types.ts';
import { routeHash } from '../route.ts';
import { DeltaRow } from './DeltaRow.tsx';
import { repoName } from './Nav.tsx';

// Every delta, grouped by project. A project's name links to the dashboard
// with only that project's deltas. Deltas are in the server's order (newest
// first, PRs that can't be opened last), with pinned ones at the top and muted
// ones at the bottom. A project sits where its first delta would, so a pin
// lifts its whole project and a project with only muted deltas sinks.
export interface DashboardProps {
  summaries: DeltaSummary[];
  onFocus?: (id: DeltaId, focus: Focus) => void;
}

export function Dashboard({ summaries, onFocus }: DashboardProps) {
  const rank = (s: DeltaSummary) => (s.focus === 'pinned' ? 0 : s.focus === 'muted' ? 2 : 1);
  const projects = new Map<string, DeltaSummary[]>();
  for (const s of [...summaries].sort((a, b) => rank(a) - rank(b))) {
    const project = projects.get(s.delta.repo);
    if (project) project.push(s);
    else projects.set(s.delta.repo, [s]);
  }
  return (
    <div className="pridm-dashboard">
      {summaries.length === 0 && <p className="pridm-muted">No changes in any checkout under your scan folders.</p>}
      {[...projects].map(([repo, deltas]) => (
        <section key={repo} className="pridm-project">
          <h3 className="pridm-project-title">
            <a href={routeHash({ page: 'dashboard', repo })}>{repoName(repo)}</a>
            <span className="pridm-muted">{deltas.length}</span>
          </h3>
          {deltas.map((s) => (
            <DeltaRow
              key={s.delta.id}
              summary={s}
              showRepo={false}
              href={routeHash({ page: 'delta', id: s.delta.id, open: [] })}
              onFocus={onFocus && ((f) => onFocus(s.delta.id, f))}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
