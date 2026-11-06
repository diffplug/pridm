// Runs git and other CLIs. node:child_process, because the server runs inside
// Vite, which runs on Node even when started with `bun run`.
//
// Async, with a limit on how many run at once, so scanning dozens of
// checkouts runs in parallel without spawning hundreds of processes.

import { execFile } from 'node:child_process';

const MAX_RUNNING = 16;
let running = 0;
const waiting: (() => void)[] = [];

async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_RUNNING) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await fn();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

export function run(command: string, args: string[], cwd: string): Promise<string> {
  return slot(
    () =>
      new Promise((resolve, reject) => {
        execFile(command, args, { cwd, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }, (err, stdout, stderr) => {
          if (err) reject(Object.assign(err, { stderr }));
          else resolve(stdout);
        });
      }),
  );
}

export function git(cwd: string, args: string[]): Promise<string> {
  return run('git', ['-c', 'core.quotePath=false', ...args], cwd);
}

// The output trimmed, or null if git failed (no upstream, no origin, ...).
export async function tryGit(cwd: string, args: string[]): Promise<string | null> {
  try {
    return (await git(cwd, args)).trim();
  } catch {
    return null;
  }
}
