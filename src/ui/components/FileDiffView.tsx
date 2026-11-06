import { useState } from 'react';
import type { FileChange } from '../../types.ts';
import { CodeDiffView } from './CodeDiffView.tsx';
import { MarkdownDiffView } from './MarkdownDiffView.tsx';

// One changed file: a header with its path and +/−, then its diff.
// Markdown files can switch between the rendered diff and the source diff.
export function FileDiffView({ file }: { file: FileChange }) {
  const [view, setView] = useState<'rendered' | 'source'>('rendered');
  const { diff } = file;

  let body;
  if (file.isBinary) body = <div className="pridm-file-note">Binary file not shown.</div>;
  else if (diff.kind === 'markdown' && view === 'rendered') body = <MarkdownDiffView diff={diff} />;
  else if (diff.kind === 'markdown')
    body = <CodeDiffView diff={{ kind: 'code', language: 'markdown', original: diff.original, modified: diff.modified }} />;
  else body = <CodeDiffView diff={diff} />;

  return (
    <div className="pridm-file">
      <div className="pridm-file-header">
        <span className="pridm-file-path" title={file.path}>
          {file.oldPath && <span className="old">{file.oldPath} → </span>}
          {file.path}
        </span>
        {file.status !== 'modified' && <span className="pridm-status">{file.status}</span>}
        {!file.committed && <span className="pridm-status">uncommitted</span>}
        {!file.isBinary && (
          <span>
            <span className="pridm-additions">+{file.additions}</span>{' '}
            <span className="pridm-deletions">−{file.deletions}</span>
          </span>
        )}
        {diff.kind === 'markdown' && !file.isBinary && (
          <span className="pridm-toggle">
            <button aria-pressed={view === 'rendered'} onClick={() => setView('rendered')}>
              Rendered
            </button>
            <button aria-pressed={view === 'source'} onClick={() => setView('source')}>
              Source
            </button>
          </span>
        )}
      </div>
      {body}
    </div>
  );
}
