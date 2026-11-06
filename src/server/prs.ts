// Your open PRs, from one GitHub GraphQL query through `gh`.
// See specs/architecture/discovery.md, "Your open PRs".

import type { RepoKey } from '../types.ts';
import { run } from './exec.ts';
import { normalizeOrigin } from './origin.ts';

export interface OpenPr {
  repo: RepoKey;            // the base repo, e.g. github.com/xtermjs/xterm.js
  headRepo: RepoKey | null; // where the branch lives; differs for a PR from a fork; null if that fork is gone
  repoUrl: string;
  number: number;
  title: string;
  url: string;
  author: string;
  isDraft: boolean;
  updatedAt: string;
  headRef: string;
  headSha: string;
  baseRef: string;
  baseSha: string;
}

const QUERY = `query {
  search(query: "is:pr is:open author:@me archived:false", type: ISSUE, first: 100) {
    nodes { ... on PullRequest {
      number title url isDraft updatedAt author { login }
      headRefName headRefOid baseRefName baseRefOid
      headRepository { url }
      repository { url }
    } }
  }
}`;

export async function openPrs(): Promise<OpenPr[]> {
  return parseSearch(JSON.parse(await run('gh', ['api', 'graphql', '-f', `query=${QUERY}`], process.cwd())));
}

interface Node {
  number: number;
  title: string;
  url: string;
  isDraft: boolean;
  updatedAt: string;
  author: { login: string } | null;
  headRefName: string;
  headRefOid: string;
  baseRefName: string;
  baseRefOid: string;
  headRepository: { url: string } | null;
  repository: { url: string };
}

export function parseSearch(json: { data: { search: { nodes: Partial<Node>[] } } }): OpenPr[] {
  return json.data.search.nodes
    .filter((n): n is Node => typeof n.number === 'number')
    .map((n) => ({
      repo: normalizeOrigin(n.repository.url)!,
      headRepo: n.headRepository ? normalizeOrigin(n.headRepository.url) : null,
      repoUrl: n.repository.url,
      number: n.number,
      title: n.title,
      url: n.url,
      author: n.author?.login ?? '',
      isDraft: n.isDraft,
      updatedAt: n.updatedAt,
      headRef: n.headRefName,
      headSha: n.headRefOid,
      baseRef: n.baseRefName,
      baseSha: n.baseRefOid,
    }));
}
