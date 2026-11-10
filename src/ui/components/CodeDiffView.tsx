import { useEffect, useRef, useState } from 'react';
import { DiffEditor, Editor, useMonaco, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { structuredPatch } from 'diff';
import '../monaco.ts';
import type { CodeDiff } from '../../types.ts';
import { defineMonacoTheme, monacoThemeName, useIsDark } from '../theme.ts';

const LINE_HEIGHT = 19;
const MIN_HEIGHT = 3 * LINE_HEIGHT;

// Monaco's DiffEditor, shown inline with unchanged regions folded. A change
// within a single line stays on one line, instead of a deleted line + an added one.
// It mounts only once it scrolls near the screen, and sizes itself to its content.
//
// Monaco first lays out the whole file, and folds the unchanged regions only once the diff comes
// back from its worker. Until then the editor is hidden, in a box the height the folded diff is
// expected to be, so the full file never flashes by.
//
// It's marked `data-diff-pending` until it has measured whether it's near the screen, and, if it is,
// until the diff is drawn with its syntax colors. Stories wait for that before a screenshot.
export function CodeDiffView({ diff }: { diff: CodeDiff }) {
  // An added or deleted file has nothing to compare with. As a diff, Monaco
  // would mark the empty side's line 1 as changed, so show the file itself.
  if (diff.original === '' && diff.modified !== '') return <WholeFileView text={diff.modified} language={diff.language} side="added" />;
  if (diff.modified === '' && diff.original !== '') return <WholeFileView text={diff.original} language={diff.language} side="deleted" />;
  return <DiffView diff={diff} />;
}

const SHARED_OPTIONS: editor.IEditorOptions = {
  readOnly: true,
  domReadOnly: true,
  automaticLayout: true,
  scrollBeyondLastLine: false,
  minimap: { enabled: false },
  overviewRulerLanes: 0,
  folding: false,
  glyphMargin: false,
  lineHeight: LINE_HEIGHT,
  fontSize: 12,
  scrollbar: { vertical: 'hidden', alwaysConsumeMouseWheel: false, verticalScrollbarSize: 0 },
  stickyScroll: { enabled: false },
};

// A whole added or deleted file, every line tinted green or red.
function WholeFileView({ text, language, side }: { text: string; language: string; side: 'added' | 'deleted' }) {
  const dark = useIsDark();
  const monaco = useMonaco();
  const [ref, near] = useNearScreen<HTMLDivElement>();
  const tokenizerReady = useTokenizer(monaco, language);
  const [drawn, setDrawn] = useState(false);
  const [height, setHeight] = useState(() => estimateHeight({ kind: 'code', language, original: '', modified: text }));

  useEffect(() => {
    if (monaco) monaco.editor.setTheme(defineMonacoTheme(monaco, dark));
  }, [monaco, dark]);

  const onMount = (ed: editor.IStandaloneCodeEditor) => {
    const resize = () => setHeight(Math.max(MIN_HEIGHT, ed.getContentHeight()));
    ed.onDidContentSizeChange(resize);
    resize();
    const model = ed.getModel();
    if (model) {
      forceTokenization(model);
      ed.createDecorationsCollection([
        {
          range: { startLineNumber: 1, startColumn: 1, endLineNumber: model.getLineCount(), endColumn: 1 },
          options: { isWholeLine: true, className: `pridm-whole-${side}`, marginClassName: `pridm-whole-${side}-margin` },
        },
      ]);
    }
    setDrawn(true);
  };

  const pending = near === null || (near && !drawn);
  return (
    <div ref={ref} style={{ height }} data-diff-pending={pending || undefined}>
      {near && tokenizerReady && (
        <Editor
          value={text}
          language={language}
          theme={monacoThemeName(dark)}
          beforeMount={(m: Monaco) => defineMonacoTheme(m, dark)}
          onMount={onMount}
          options={SHARED_OPTIONS}
        />
      )}
    </div>
  );
}

function DiffView({ diff }: { diff: CodeDiff }) {
  const dark = useIsDark();
  const monaco = useMonaco();
  const [ref, near] = useNearScreen<HTMLDivElement>();
  const tokenizerReady = useTokenizer(monaco, diff.language);
  const [drawn, setDrawn] = useState(false);
  const [height, setHeight] = useState(() => estimateFoldedHeight(diff));

  // Re-read Primer's colors whenever light/dark changes.
  useEffect(() => {
    if (monaco) monaco.editor.setTheme(defineMonacoTheme(monaco, dark));
  }, [monaco, dark]);

  const onMount = (ed: editor.IStandaloneDiffEditor) => {
    const modified = ed.getModifiedEditor();
    // The content's height means nothing until the unchanged regions are folded.
    let folded = false;
    const resize = () => folded && setHeight(Math.max(MIN_HEIGHT, modified.getContentHeight()));
    modified.onDidContentSizeChange(resize);
    // The folds are applied just after the diff arrives, so wait a frame before showing it.
    const show = () =>
      requestAnimationFrame(() => {
        folded = true;
        resize();
        setDrawn(true);
      });
    markInlineChanges(ed);
    // Color every line now, before the diff comes back from its worker. Otherwise the deleted lines,
    // which come from the hidden original editor, can paint before they're colored.
    for (const model of [ed.getOriginalEditor().getModel(), modified.getModel()]) {
      if (model) forceTokenization(model);
    }
    ed.onDidUpdateDiff(show);
    if (ed.getLineChanges() !== null) show();
  };

  const pending = near === null || (near && !drawn);
  return (
    <div ref={ref} style={{ height, overflow: 'hidden', visibility: drawn ? undefined : 'hidden' }} data-diff-pending={pending || undefined}>
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
            // A change within one line is shown on that one line, with the
            // old text struck through next to the new text.
            experimental: { useTrueInlineView: true },
            // Only the changes and 3 lines around them show. The fold bars between
            // reveal 20 more lines a click, up or down, or everything; theme.css
            // makes their arrows visible.
            hideUnchangedRegions: { enabled: true, contextLineCount: 3, minimumLineCount: 3, revealLineCount: 20 },
            originalEditable: false,
            renderOverviewRuler: false,
            ...SHARED_OPTIONS,
          }}
        />
      )}
    </div>
  );
}

// Monaco colors the gutter of every changed line with the strong "line number"
// color. A change shown inline on one line only gets the light line color, so
// its gutter looks too dark. Mark those lines so theme.css can lighten them.
function markInlineChanges(ed: editor.IStandaloneDiffEditor) {
  const original = ed.getOriginalEditor().createDecorationsCollection();
  const modified = ed.getModifiedEditor().createDecorationsCollection();
  const update = () => {
    const o: editor.IModelDeltaDecoration[] = [];
    const m: editor.IModelDeltaDecoration[] = [];
    for (const c of ed.getLineChanges() ?? []) {
      if (!isShownInline(c)) continue;
      const options = { marginClassName: 'pridm-inline-change', isWholeLine: true };
      for (let l = c.originalStartLineNumber; l <= c.originalEndLineNumber; l++) o.push({ range: lineRange(l), options });
      for (let l = c.modifiedStartLineNumber; l <= c.modifiedEndLineNumber; l++) m.push({ range: lineRange(l), options });
    }
    original.set(o);
    modified.set(m);
  };
  ed.onDidUpdateDiff(update);
  update();
}

// Monaco's own rule for useTrueInlineView: a change is shown inline when it
// replaces existing lines and every changed piece stays within one line.
function isShownInline(c: editor.ILineChange): boolean {
  if (c.originalEndLineNumber === 0 || c.modifiedEndLineNumber === 0 || !c.charChanges) return false;
  return c.charChanges.every(
    (cc) => cc.originalStartLineNumber === cc.originalEndLineNumber && cc.modifiedStartLineNumber === cc.modifiedEndLineNumber,
  );
}

function lineRange(line: number) {
  return { startLineNumber: line, startColumn: 1, endLineNumber: line, endColumn: 1 };
}

// A guess at the height before Monaco mounts, so the page doesn't jump much.
function estimateHeight(diff: CodeDiff): number {
  const lines = Math.max(diff.original.split('\n').length, diff.modified.split('\n').length);
  return Math.max(MIN_HEIGHT, Math.min(lines, 30) * LINE_HEIGHT);
}

// A guess at a diff's height once its unchanged regions are folded: the changed lines, 3 lines of
// context around each run of them, and a fold bar between runs. Close enough that showing the real
// diff barely moves the page.
function estimateFoldedHeight(diff: CodeDiff): number {
  const FOLD_BAR = 24;
  const { hunks } = structuredPatch('', '', diff.original, diff.modified, '', '', { context: 3 });
  const lines = hunks.reduce((n, h) => n + h.lines.filter((l) => !l.startsWith('\\')).length, 0);
  return Math.max(MIN_HEIGHT, lines * LINE_HEIGHT + (hunks.length + 1) * FOLD_BAR);
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
