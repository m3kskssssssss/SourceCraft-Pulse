// Управление жизненным циклом bare-клона в /tmp.
// Один клон обслуживает и историю (git log), и чтение конкретных файлов
// (git show HEAD:path — --filter=blob:none тянет только нужные блобы).
//
// Использование:
//   await withBareClone({ cloneUrlHttps, token }, async (workDir) => { ... });
//
// ВАЖНО: только для воркера. Не импортировать из App Router / API-роутов.

import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type BareCloneOptions = {
  cloneUrlHttps: string;
  token?: string;
  /** Таймаут именно на clone; операции внутри — свой лимит через runGit. */
  cloneTimeoutMs?: number;
};

const DEFAULT_CLONE_TIMEOUT_MS = 180_000;

export async function withBareClone<T>(
  options: BareCloneOptions,
  fn: (workDir: string) => Promise<T>,
): Promise<T> {
  const workDir = await mkdtemp(join(tmpdir(), 'pulse-git-'));
  try {
    await runGit(
      [
        'clone',
        '--filter=blob:none',
        '--bare',
        '--quiet',
        injectToken(options.cloneUrlHttps, options.token),
        workDir,
      ],
      { timeoutMs: options.cloneTimeoutMs ?? DEFAULT_CLONE_TIMEOUT_MS },
    );
    return await fn(workDir);
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {
      // мусор в tmp — пусть, лишь бы не мешало возврату
    });
  }
}

type RunGitOptions = {
  cwd?: string;
  timeoutMs: number;
  maxBufferBytes?: number;
};

/** Запускает git и возвращает stdout. Кидает Error с текстом stderr на ненулевой exit. */
export function runGit(args: string[], options: RunGitOptions): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawn('git', args, {
      cwd: options.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });

    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    const maxBytes = options.maxBufferBytes ?? 16 * 1024 * 1024;
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
    }, options.timeoutMs);

    proc.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes > maxBytes) {
        killed = true;
        proc.kill('SIGKILL');
        return;
      }
      stdout.push(chunk);
    });
    proc.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

    proc.on('error', (err: Error) => {
      clearTimeout(timer);
      rejectPromise(err);
    });

    proc.on('close', (code: number | null) => {
      clearTimeout(timer);
      if (killed) {
        rejectPromise(new Error(`git ${args[0]} killed (timeout or buffer overflow)`));
        return;
      }
      if (code !== 0) {
        const err = Buffer.concat(stderr).toString('utf8').trim();
        rejectPromise(new Error(`git ${args[0]} exited ${code}: ${err.slice(0, 500)}`));
        return;
      }
      resolvePromise(Buffer.concat(stdout).toString('utf8'));
    });
  });
}

/** Читает содержимое файла из bare-клона по ссылке ref:path. Null, если файл отсутствует. */
export async function readFileFromClone(
  workDir: string,
  refPath: string, // 'HEAD:package-lock.json'
  options: { timeoutMs?: number; maxBufferBytes?: number } = {},
): Promise<string | null> {
  try {
    return await runGit(['show', refPath], {
      cwd: workDir,
      timeoutMs: options.timeoutMs ?? 30_000,
      maxBufferBytes: options.maxBufferBytes ?? 8 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

function injectToken(cloneUrl: string, token?: string): string {
  if (!token) return cloneUrl;
  try {
    const url = new URL(cloneUrl);
    url.username = 'x-access-token';
    url.password = token;
    return url.toString();
  } catch {
    return cloneUrl;
  }
}
