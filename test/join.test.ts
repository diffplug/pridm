import { describe, expect, test } from 'bun:test';
import { plan, type Checkout } from '../src/server/discover.ts';
import type { OpenPr } from '../src/server/prs.ts';

const checkout = (repo: string, branch: string | null, remotes: Record<string, string> = {}): Checkout => ({
  top: `/p/${repo.split('/').pop()}-${branch}`,
  headSha: 'h',
  branch,
  repo,
  id: branch ? `${repo}:${branch}` : `${repo}@/p`,
  defaultRef: 'origin/main',
  remotes: new Map([[repo, 'origin'], ...Object.entries(remotes)]),
});

const pr = (repo: string, headRef: string, headRepo = repo): OpenPr => ({
  repo, headRepo, headRef, repoUrl: `https://${repo}`, number: 1, title: 't', url: 'u', author: 'a',
  isDraft: false, updatedAt: '', headSha: 'h', baseRef: 'main', baseSha: 'b',
});

const kinds = (plans: ReturnType<typeof plan>) =>
  plans.map((p) => (p.kind === 'local' ? `local ${p.checkout.id}${p.pr ? ' +pr' : ''}` : p.kind === 'pr' ? `pr ${p.clone.id}` : 'unavailable'));

describe('plan', () => {
  test('a PR joins the checkout of its branch', () => {
    expect(kinds(plan([checkout('github.com/o/r', 'feat')], [pr('github.com/o/r', 'feat')]))).toEqual(['local github.com/o/r:feat +pr']);
  });

  test('a checkout with no PR is still a local delta', () => {
    expect(kinds(plan([checkout('github.com/o/r', 'feat')], []))).toEqual(['local github.com/o/r:feat']);
  });

  test("a PR whose branch isn't checked out is read from a clone of its repo", () => {
    expect(kinds(plan([checkout('github.com/o/r', 'main')], [pr('github.com/o/r', 'feat')]))).toEqual([
      'pr github.com/o/r:main',
      'local github.com/o/r:main',
    ]);
  });

  test('a PR from a fork joins a checkout of the fork, not of the base repo', () => {
    const fork = checkout('github.com/me/r', 'fix', { 'github.com/them/r': 'upstream' });
    const base = checkout('github.com/them/r', 'fix');
    const plans = kinds(plan([base, fork], [pr('github.com/them/r', 'fix', 'github.com/me/r')]));
    expect(plans).toContain('local github.com/me/r:fix +pr');
    expect(plans).toContain('local github.com/them/r:fix');
  });

  test('a fork PR that isn\'t checked out is read from a clone with a remote for the base repo', () => {
    const fork = checkout('github.com/me/r', 'main', { 'github.com/them/r': 'upstream' });
    expect(kinds(plan([fork], [pr('github.com/them/r', 'fix', 'github.com/me/r')]))[0]).toBe('pr github.com/me/r:main');
  });

  test("a PR whose repo isn't cloned anywhere is unavailable", () => {
    expect(kinds(plan([checkout('github.com/o/other', 'main')], [pr('github.com/o/r', 'feat')]))[0]).toBe('unavailable');
  });
});
