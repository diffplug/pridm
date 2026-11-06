// Puts a path into a category, using one origin's globs. See specs/architecture/categories.md.

import picomatch from 'picomatch';
import { OTHER, type Category, type CategoryGlobs } from '../types.ts';

export type Classifier = (path: string) => Category;

// Categories are checked in the order they're written; the first match wins.
export function classifier(globs: CategoryGlobs): Classifier {
  const matchers = Object.entries(globs).map(([category, patterns]) => ({
    category,
    match: picomatch(patterns, { dot: true }),
  }));
  return (path) => matchers.find((m) => m.match(path))?.category ?? OTHER;
}

// The order of a delta's sections: the origin's categories as written, then OTHER.
export function sectionOrder(globs: CategoryGlobs): Category[] {
  return [...Object.keys(globs).filter((c) => c !== OTHER), OTHER];
}
