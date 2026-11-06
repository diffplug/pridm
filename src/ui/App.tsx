import { FileDiffView } from './components/FileDiffView.tsx';
import { realCode, realSpec } from './fixtures/files.ts';

// Placeholder until the server exists: shows the fixture diffs.
export function App() {
  return (
    <main style={{ maxWidth: 1012, margin: '0 auto', padding: 24 }}>
      <h1>pridm</h1>
      <FileDiffView file={realSpec} />
      <FileDiffView file={realCode} />
    </main>
  );
}
