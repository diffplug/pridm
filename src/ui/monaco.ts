// Monaco from our own bundle instead of @monaco-editor/react's default CDN, so it works offline,
// and inside Selfie's renderer, which has no network.
//
// The core editor with syntax highlighting for every language Monaco knows, and JSON's language
// service. No TypeScript, CSS, or HTML language services: a diff viewer has no use for their
// diagnostics, which would also arrive late and make screenshots vary.
import 'monaco-editor/esm/vs/editor/edcore.main.js';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker';
import { loader } from '@monaco-editor/react';

import.meta.glob('/node_modules/monaco-editor/esm/vs/basic-languages/*/*.contribution.js', { eager: true });

self.MonacoEnvironment = {
  getWorker: (_id, label) => (label === 'json' ? new JsonWorker() : new EditorWorker()),
};

loader.config({ monaco });
