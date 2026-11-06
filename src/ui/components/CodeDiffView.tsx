import { useEffect, useRef, useState } from 'react';
import { DiffEditor, useMonaco, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { CodeDiff } from '../../types.ts';
import '../monaco.ts';
import { defineMonacoTheme, monacoThemeName, useIsDark } from '../theme.ts';

const LINE_HEIGHT = 19;
const MIN_HEIGHT = 3 * LINE_HEIGHT;

// Monaco's DiffEditor, shown inline with unchanged regions folded.
// It mounts only once it scrolls near the screen, and sizes itself to its content.
//
// It's marked `data-diff-pending` until it has measured whether it's near the screen, and, if it is,
// until the diff is drawn with its syntax colors. Stories wait for that before a screenshot.
export function CodeDiffView({ diff }: { diff: CodeDiff }) {
  const dark = useIsDark();
  const monaco = useMonaco();
  const [ref, near] = useNearScreen<HTMLDivElement>();
  const tokenizerReady = useTokenizer(monaco, diff.language);
  const [drawn, setDrawn] = useState(false);
  const [height, setHeight] = useState(() => estimateHeight(diff));

  // Re-read Primer's colors whenever light/dark changes.
  useEffect(() => {
    if (monaco) monaco.editor.setTheme(defineMonacoTheme(monaco, dark));
  }, [monaco, dark]);

  const onMount = (ed: editor.IStandaloneDiffEditor) => {
    const modified = ed.getModifiedEditor();
    const resize = () => setHeight(Math.max(MIN_HEIGHT, modified.getContentHeight()));
    modified.onDidContentSizeChange(resize);
    resize();
    // Color every line now, before the diff comes back from its worker. Otherwise the deleted lines,
    // which come from the hidden original editor, can paint before they're colored.
    for (const model of [ed.getOriginalEditor().getModel(), modified.getModel()]) {
      if (model) forceTokenization(model);
    }
    ed.onDidUpdateDiff(() => setDrawn(true));
    if (ed.getLineChanges() !== null) setDrawn(true);
  };

  const pending = near === null || (near && !drawn);
  return (
    <div ref={ref} style={{ height }} data-diff-pending={pending || undefined}>
      {near && tokenizerReady && (
        <DiffEditor
          original={diff.original}
          modified={diff.modified}
          language={diff.language}
          theme={monacoThemeName(dark)}
          beforeMount={(m: Monaco) => defineMonacoTheme(m, dark)}
          onMount={onMount}
          options={{
            renderSideBySide: false,
            useInlineViewWhenSpaceIsLimited: true,
            hideUnchangedRegions: { enabled: true, contextLineCount: 3, minimumLineCount: 3, revealLineCount: 20 },
            readOnly: true,
            domReadOnly: true,
            originalEditable: false,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            renderOverviewRuler: false,
            overviewRulerLanes: 0,
            folding: false,
            glyphMargin: false,
            lineHeight: LINE_HEIGHT,
            fontSize: 12,
            scrollbar: { vertical: 'hidden', alwaysConsumeMouseWheel: false, verticalScrollbarSize: 0 },
            stickyScroll: { enabled: false },
          }}
        />
      )}
    </div>
  );
}

// A guess at the height before Monaco mounts, so the page doesn't jump much.
function estimateHeight(diff: CodeDiff): number {
  const lines = Math.max(diff.original.split('\n').length, diff.modified.split('\n').length);
  return Math.max(MIN_HEIGHT, Math.min(lines, 30) * LINE_HEIGHT);
}

// Null until first measured, then true once the element comes within a screen's height of the viewport. Stays true.
function useNearScreen<T extends Element>(): [React.RefObject<T | null>, boolean | null] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState<boolean | null>(null);
  useEffect(() => {
    if (near || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => setNear(entries.some((e) => e.isIntersecting)),
      { rootMargin: '100% 0px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [near]);
  return [ref, near];
}

// True once Monaco has loaded the syntax colors for a language, which each load lazily.
// An unknown language is ready at once, as plain text.
function useTokenizer(monaco: Monaco | null, language: string): boolean {
  const [readyFor, setReadyFor] = useState<string | null>(null);
  useEffect(() => {
    if (!monaco) return;
    let live = true;
    const done = () => live && setReadyFor(language);
    monaco.editor.colorize('', language, {}).then(done, done);
    return () => {
      live = false;
    };
  }, [monaco, language]);
  return readyFor === language;
}

// Monaco's models can tokenize every line at once, though only internally. Without it, lines are
// colored in the background, which is just later.
function forceTokenization(model: editor.ITextModel) {
  const tokenization = (model as unknown as { tokenization?: { forceTokenization?(lineNumber: number): void } }).tokenization;
  tokenization?.forceTokenization?.(model.getLineCount());
}
