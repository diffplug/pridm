// Dashboard rows built from the delta fixtures.

import type { DeltaSummary, Focus } from '../../types.ts';
import { customCategories, empty, localAndPr, neverPushed, prOnly, selfDelta, type DeltaFixture } from './deltas.ts';

export function summary(f: DeltaFixture, focus: Focus = 'normal'): DeltaSummary {
  return { delta: f.overview.delta, focus, categories: f.overview.categories.map(({ files: _, ...stat }) => stat) };
}

export const draftPr: DeltaSummary = {
  ...summary(prOnly),
  delta: { ...prOnly.overview.delta, title: 'Stack: grant images to the uploader', pr: { ...prOnly.overview.delta.pr!, number: 46, state: 'draft' } },
};

export const unavailablePr: DeltaSummary = {
  delta: { ...prOnly.overview.delta, id: 'github.com/diffplug/dp-app:simulink-upgrade', repo: 'github.com/diffplug/dp-app', title: 'Upgrade to Simulink R2026b', pr: { ...prOnly.overview.delta.pr!, number: 104, url: 'https://github.com/diffplug/dp-app/pull/104', state: 'draft' } },
  focus: 'normal',
  categories: [],
  unavailable: "github.com/diffplug/dp-app isn't cloned in your scan folders",
};

export const summaries: DeltaSummary[] = [
  summary(localAndPr),
  summary(selfDelta),
  summary(prOnly),
  summary(neverPushed),
  summary(customCategories, 'pinned'),
  draftPr,
  summary(empty, 'muted'),
  unavailablePr,
];
