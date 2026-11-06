import { useEffect, useState } from 'react';
import type { Monaco } from '@monaco-editor/react';

// Light or dark comes from <html data-color-mode="light | dark | auto">,
// the same attribute Primer's CSS reads.
function readIsDark(): boolean {
  const mode = document.documentElement.getAttribute('data-color-mode');
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useIsDark(): boolean {
  const [dark, setDark] = useState(readIsDark);
  useEffect(() => {
    const update = () => setDark(readIsDark());
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode'] });
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', update);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
    };
  }, []);
  return dark;
}

// Monaco can't read CSS variables, so its theme is built from Primer's
// current values. Call this after the color mode is applied.
function cssVar(name: string): string | undefined {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value.startsWith('#') ? value : undefined;
}

export function monacoThemeName(dark: boolean): string {
  return dark ? 'pridm-dark' : 'pridm-light';
}

export function defineMonacoTheme(monaco: Monaco, dark: boolean): string {
  const colors: Record<string, string | undefined> = {
    'editor.background': cssVar('--bgColor-default'),
    'editor.foreground': cssVar('--fgColor-default'),
    'editorLineNumber.foreground': cssVar('--fgColor-muted'),
    'editorGutter.background': cssVar('--bgColor-default'),
    'diffEditor.insertedTextBackground': cssVar('--diffBlob-additionWord-bgColor'),
    'diffEditor.removedTextBackground': cssVar('--diffBlob-deletionWord-bgColor'),
    'diffEditor.insertedLineBackground': cssVar('--diffBlob-additionLine-bgColor'),
    'diffEditor.removedLineBackground': cssVar('--diffBlob-deletionLine-bgColor'),
    'diffEditorGutter.insertedLineBackground': cssVar('--diffBlob-additionNum-bgColor'),
    'diffEditorGutter.removedLineBackground': cssVar('--diffBlob-deletionNum-bgColor'),
    'diffEditor.unchangedRegionBackground': cssVar('--bgColor-muted'),
  };
  const name = monacoThemeName(dark);
  monaco.editor.defineTheme(name, {
    base: dark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [],
    colors: Object.fromEntries(Object.entries(colors).filter(([, v]) => v)) as Record<string, string>,
  });
  return name;
}
