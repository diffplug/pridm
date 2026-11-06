// The same story in dark mode, as the toolbar's color mode would show it. Every story has a
// dark twin, since a screenshot renders only a story's own globals.
export function dark<S extends { globals?: Record<string, unknown> }>(story: S): S {
  return { ...story, globals: { ...story.globals, colorMode: 'dark' } };
}

// A play function that waits until every code diff on screen is drawn, so a screenshot taken when
// the story finishes never catches Monaco part way. See `data-diff-pending` in CodeDiffView.
export async function waitForDiffs({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
  while (canvasElement.querySelector('[data-diff-pending]')) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}
