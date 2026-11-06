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
import type { MarkdownDiff } from '../../types.ts';
import { useIsDark } from '../theme.ts';
import { CodeDiffView } from './CodeDiffView.tsx';

// Lexical renders text that is both `code` and ==highlighted== as a bare <code>,
// so CSS can't see the highlight. Giving the two formats our own class names
// makes Lexical put them on every element in that format, code included.
const THEME = {
  ...lexicalTheme,
  text: { ...lexicalTheme.text, highlight: 'pridm-ins', strikethrough: 'pridm-del' },
};

// The merged markdown (see src/shared/mdmerge.ts), rendered by a read-only MDXEditor.
// If MDXEditor can't parse it, falls back to a source diff in Monaco.
export function MarkdownDiffView({ diff }: { diff: MarkdownDiff }) {
  const dark = useIsDark();
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <CodeDiffView diff={{ kind: 'code', language: 'markdown', original: diff.original, modified: diff.modified }} />;
  }
  return (
    <MDXEditor
      key={diff.merged}  // `markdown` is only read on mount
      markdown={diff.merged}
      readOnly
      className={dark ? 'dark-theme' : undefined}
      contentEditableClassName="pridm-md"
      lexicalTheme={THEME}
      onError={() => setFailed(true)}
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
