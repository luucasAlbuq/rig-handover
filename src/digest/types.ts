export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: 'ok' | 'retry' | 'fail';
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type ReadNightResult = {
  rows: DigestRow[];
  badLines: number;
};

export { lineStatusCounts, nightExists, readNight } from './readNight.js';
