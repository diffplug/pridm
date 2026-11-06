import { useState } from 'react';
import {
  MDXEditor,
  codeBlockPlugin,
  headingsPlugin,
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
