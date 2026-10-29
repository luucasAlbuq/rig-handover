import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, ReadNightResult } from './types.js';

type Parsed = {
  at: string;
  job: string;
  status: DigestRow['lastStatus'];
  owner: string | null;
  error: string | null;
};

function nightPath(runsDir: string, night: string): string {
  return join(runsDir, `${night}.jsonl`);
}

export function nightExists(runsDir: string, night: string): boolean {
  return existsSync(nightPath(runsDir, night));
}

function parseLine(raw: string): Parsed | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const row = value as Record<string, unknown>;
  if (typeof row.at !== 'string' || typeof row.job !== 'string') return null;
  if (row.status !== 'ok' && row.status !== 'retry' && row.status !== 'fail') return null;
  if (row.owner !== null && typeof row.owner !== 'string') return null;
  if (row.error !== undefined && typeof row.error !== 'string') return null;
  return {
    at: row.at,
    job: row.job,
    status: row.status,
    owner: row.owner,
    error: typeof row.error === 'string' ? row.error : null,
  };
}

export function readNight(runsDir: string, night: string): ReadNightResult {
  const text = readFileSync(nightPath(runsDir, night), 'utf8');
  const byJob = new Map<string, DigestRow>();
  let badLines = 0;

  for (const raw of text.split('\n')) {
    if (raw.length === 0) continue;
    const line = parseLine(raw);
    if (!line) {
      badLines++;
      continue;
    }
    const existing = byJob.get(line.job);
    if (!existing) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error,
        firstAt: line.at,
        lastAt: line.at,
      });
      continue;
    }
    existing.runs++;
    if (line.status === 'retry') existing.retries++;
    if (line.at < existing.firstAt) existing.firstAt = line.at;
    if (line.at >= existing.lastAt) {
      existing.lastAt = line.at;
      existing.lastStatus = line.status;
      existing.lastError = line.error;
      existing.owner = line.owner;
    }
  }

  return {
    rows: [...byJob.values()].sort((a, b) => a.job.localeCompare(b.job)),
    badLines,
  };
}

export function lineStatusCounts(runsDir: string, night: string): { ok: number; retry: number; fail: number } {
  const text = readFileSync(nightPath(runsDir, night), 'utf8');
  const counts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split('\n')) {
    if (raw.length === 0) continue;
    const line = parseLine(raw);
    if (!line) continue;
    counts[line.status]++;
  }
  return counts;
}

export function isEmptyNight(runsDir: string, night: string): boolean {
  return readFileSync(nightPath(runsDir, night), 'utf8').trim().length === 0;
}
