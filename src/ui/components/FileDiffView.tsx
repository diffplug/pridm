import { useState } from 'react';
import type { FileChange, FileStat } from '../../types.ts';
import { CodeDiffView } from './CodeDiffView.tsx';
import { MarkdownDiffView } from './MarkdownDiffView.tsx';
import { PlusMinus } from './PlusMinus.tsx';

export interface FileDiffViewProps {
  // A FileStat until its contents have loaded, then the FileChange.
  file: FileStat | FileChange;
  defaultOpen?: boolean;
}

// One changed file: a header with its path and +/−, which expands to its diff.
// Markdown files can switch between the rendered diff and the source diff.
export function FileDiffView({ file, defaultOpen = false }: FileDiffViewProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [view, setView] = useState<'rendered' | 'source'>('rendered');
  const markdown = 'diff' in file ? file.diff.kind === 'markdown' : file.words !== undefined;

  return (
    <div className="pridm-file" data-open={open}>
      <div
        className="pridm-file-header"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          }
        }}
      >
        <span className="pridm-chevron">{open ? '▾' : '▸'}</span>
        <span className="pridm-file-path" title={file.path}>
          {file.oldPath && <span className="old">{file.oldPath} → </span>}
          {file.path}
        </span>
        {file.status !== 'modified' && <span className="pridm-status">{file.status}</span>}
        {!file.committed && <span className="pridm-status">uncommitted</span>}
        {file.isBinary ? (
          <span className="pridm-muted">binary</span>
        ) : (
          <PlusMinus additions={file.additions} deletions={file.deletions} words={file.words} />
        )}
        {open && markdown && !file.isBinary && (
          // Clicking these switches the view without collapsing the file.
          <span className="pridm-toggle" onClick={(e) => e.stopPropagation()}>
            <button aria-pressed={view === 'rendered'} onClick={() => setView('rendered')}>
              Rendered
            </button>
            <button aria-pressed={view === 'source'} onClick={() => setView('source')}>
              Source
            </button>
          </span>
        )}
      </div>
      {open && <FileBody file={file} view={view} />}
    </div>
  );
}

function FileBody({ file, view }: { file: FileStat | FileChange; view: 'rendered' | 'source' }) {
  if (file.isBinary) return <div className="pridm-file-note">Binary file not shown.</div>;
  if (!('diff' in file)) return <div className="pridm-file-note">Loading…</div>;
  const { diff } = file;
  if (diff.kind === 'markdown' && view === 'rendered') return <MarkdownDiffView diff={diff} />;
  if (diff.kind === 'markdown')
    return <CodeDiffView diff={{ kind: 'code', language: 'markdown', original: diff.original, modified: diff.modified }} />;
  return <CodeDiffView diff={diff} />;
}
