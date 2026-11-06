import { useState } from 'react';
import {
  MDXEditor,
  codeBlockPlugin,
  headingsPlugin,
  lexicalTheme,
  linkPlugin,
  listsPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  type CodeBlockEditorProps,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';
import type { MarkdownDiff, MarkdownPiece } from '../../types.ts';
import { fold, revealStep } from '../../shared/fold.ts';
import { joinPieces } from '../../shared/mdmerge.ts';
import { useIsDark } from '../theme.ts';
import { CodeDiffView } from './CodeDiffView.tsx';
import { ExpandBar } from './ExpandBar.tsx';

// Lexical renders text that is both `code` and ==highlighted== as a bare <code>,
// so CSS can't see the highlight. Giving the two formats our own class names
// makes Lexical put them on every element in that format, code included.
const THEME = {
  ...lexicalTheme,
  text: { ...lexicalTheme.text, highlight: 'pridm-ins', strikethrough: 'pridm-del' },
};

// The merged markdown (see src/shared/mdmerge.ts), rendered by read-only
// MDXEditors: one for each shown part, with an expando between them where
// unchanged blocks are folded away (see src/shared/fold.ts).
// If MDXEditor can't parse something, falls back to a source diff in Monaco.
export function MarkdownDiffView({ diff }: { diff: MarkdownDiff }) {
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set());

  if (failed) {
    return <CodeDiffView diff={{ kind: 'code', language: 'markdown', original: diff.original, modified: diff.modified }} />;
  }
  const segments = fold(diff.pieces, revealed);
  return (
    <div className="pridm-md-diff">
      {segments.map((s, i) =>
        s.kind === 'shown' ? (
          <Rendered key={`${s.from}-${s.to}`} pieces={diff.pieces.slice(s.from, s.to)} onError={() => setFailed(true)} />
        ) : (
          <ExpandBar
            key={`${s.from}-${s.to}`}
            hidden={s.to - s.from}
            unit="block"
            label={s.label}
            canDown={i > 0}
            canUp={i < segments.length - 1}
            onExpand={(direction) => setRevealed((r) => new Set([...r, ...revealStep(s, direction)]))}
          />
        ),
      )}
    </div>
  );
}

function Rendered({ pieces, onError }: { pieces: MarkdownPiece[]; onError: () => void }) {
  const dark = useIsDark();
  const markdown = joinPieces(pieces);
  return (
    <MDXEditor
      key={markdown}  // `markdown` is only read on mount
      markdown={markdown}
      readOnly
      className={dark ? 'dark-theme' : undefined}
      contentEditableClassName="pridm-md"
      lexicalTheme={THEME}
      onError={onError}
      plugins={[
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        tablePlugin(),
        codeBlockPlugin({
          codeBlockEditorDescriptors: [{ priority: 0, match: () => true, Editor: ReadOnlyCodeBlock }],
        }),
      ]}
    />
  );
}

// Code blocks as plain <pre>, for every language, so an unknown one never fails.
function ReadOnlyCodeBlock({ code }: CodeBlockEditorProps) {
  return (
    <pre>
      <code>{code}</code>
    </pre>
  );
}
