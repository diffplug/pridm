import { useEffect, useRef, useState } from 'react';
import { DiffEditor, useMonaco, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import '../monaco.ts';
import type { CodeDiff } from '../../types.ts';
import { defineMonacoTheme, monacoThemeName, useIsDark } from '../theme.ts';

const LINE_HEIGHT = 19;
const MIN_HEIGHT = 3 * LINE_HEIGHT;

// Monaco's DiffEditor, shown inline with unchanged regions folded. A change
// within a single line stays on one line, instead of a deleted line + an added one.
// It mounts only once it scrolls near the screen, and sizes itself to its content.
export function CodeDiffView({ diff }: { diff: CodeDiff }) {
  const dark = useIsDark();
  const monaco = useMonaco();
  const [ref, visible] = useNearScreen<HTMLDivElement>();
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
    markInlineChanges(ed);
  };

  return (
    <div ref={ref} style={{ height }}>
      {visible && (
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

// True once the element comes within a screen's height of the viewport. Stays true.
function useNearScreen<T extends Element>(): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisible(true);
      },
      { rootMargin: '100% 0px' },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);
  return [ref, visible];
}
