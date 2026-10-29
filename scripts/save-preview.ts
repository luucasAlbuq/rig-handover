import { writeFileSync } from 'node:fs';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const night = process.argv[2] ?? '2026-10-28';
const out = process.argv[3] ?? `preview-digest-${night}.html`;
const res = await createApp(loadConfig()).request(`/digest/${night}`);
if (res.status !== 200) {
  console.error(`GET /digest/${night} → ${res.status}`);
  process.exit(1);
}
writeFileSync(out, await res.text());
console.log(out);
