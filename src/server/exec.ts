// Runs git and other CLIs. node:child_process, because the server runs inside
// Vite, which runs on Node even when started with `bun run`.

import { execFileSync } from 'node:child_process';

export function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });
}

export function git(cwd: string, args: string[]): string {
  return run('git', args, cwd);
}
