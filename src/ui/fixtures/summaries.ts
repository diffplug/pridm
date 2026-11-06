// Dashboard rows built from the delta fixtures.

import type { DeltaSummary, Focus } from '../../types.ts';
import { customCategories, empty, localAndPr, neverPushed, prOnly, selfDelta, type DeltaFixture } from './deltas.ts';

export function summary(f: DeltaFixture, focus: Focus = 'normal'): DeltaSummary {
  return { delta: f.overview.delta, focus, categories: f.overview.categories.map(({ files: _, ...stat }) => stat) };
}

export const summaries: DeltaSummary[] = [
  summary(localAndPr),
  summary(selfDelta),
  summary(prOnly),
  summary(neverPushed),
  summary(customCategories, 'pinned'),
  summary(empty, 'muted'),
];
