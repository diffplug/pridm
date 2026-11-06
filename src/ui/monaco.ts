// Use the bundled monaco-editor instead of @monaco-editor/react's default CDN
// copy, so the version we run is the one we have types for, and it works offline,
// including in Selfie's renderer, which has no network.
// Import this once, before any editor mounts.

import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import JsonWorker from 'monaco-editor/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/language/html/html.worker?worker';

self.MonacoEnvironment = {
  getWorker(_id: string, label: string) {
    if (label === 'typescript' || label === 'javascript') return new TsWorker();
    if (label === 'json') return new JsonWorker();
    if (label === 'css' || label === 'scss' || label === 'less') return new CssWorker();
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new HtmlWorker();
    return new EditorWorker();
  },
};

// A diff shows one file without its project, so a language service can't resolve its imports, and
// would mark them as errors. Those marks also arrive late, so a screenshot may or may not have them.
const quiet = { noSemanticValidation: true, noSyntaxValidation: true, noSuggestionDiagnostics: true };
monaco.typescript.typescriptDefaults.setDiagnosticsOptions(quiet);
monaco.typescript.javascriptDefaults.setDiagnosticsOptions(quiet);
for (const css of [monaco.css.cssDefaults, monaco.css.scssDefaults, monaco.css.lessDefaults]) {
  css.setOptions({ ...css.options, validate: false });
}
monaco.json.jsonDefaults.setDiagnosticsOptions({ ...monaco.json.jsonDefaults.diagnosticsOptions, validate: false });

loader.config({ monaco });
