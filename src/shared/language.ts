// Monaco language ids by file extension. Markdown files get the rendered diff.

const BY_EXTENSION: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  json: 'json', jsonc: 'json', lock: 'json',
  css: 'css', scss: 'scss', less: 'less', html: 'html',
  md: 'markdown', mdx: 'markdown',
  yml: 'yaml', yaml: 'yaml', toml: 'ini', ini: 'ini',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  py: 'python', go: 'go', java: 'java', kt: 'kotlin', kts: 'kotlin', gradle: 'java',
  rs: 'rust', rb: 'ruby', swift: 'swift', c: 'c', h: 'cpp', cpp: 'cpp', cs: 'csharp',
  sql: 'sql', xml: 'xml', svg: 'xml',
};

export function languageOf(path: string): string {
  const name = path.split('/').pop() ?? '';
  if (name === 'Dockerfile') return 'dockerfile';
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  return BY_EXTENSION[ext] ?? 'plaintext';
}

export function isMarkdown(path: string): boolean {
  return languageOf(path) === 'markdown';
}
