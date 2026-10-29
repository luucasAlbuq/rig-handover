import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { isEmptyNight, lineStatusCounts, nightExists, readNight } from './digest/readNight.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { DigestPage } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) => {
    const status = readStatus(config);
    const nights = status.nights.map((night) => ({
      night,
      counts: lineStatusCounts(config.runsDir, night),
    }));
    return c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={status} nights={nights} />
      </Layout>,
    );
  });

  app.get('/digest/:night', (c) => {
    const night = c.req.param('night');
    if (!nightExists(config.runsDir, night)) return c.notFound();
    const empty = isEmptyNight(config.runsDir, night);
    const { rows } = empty ? { rows: [] } : readNight(config.runsDir, night);
    return c.html(
      <Layout title={`digest · ${night}`} lane={lane()}>
        <DigestPage night={night} rows={rows} empty={empty} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    if (!nightExists(config.runsDir, night)) return c.notFound();
    if (isEmptyNight(config.runsDir, night)) return c.json({ rows: [], badLines: 0 });
    return c.json(readNight(config.runsDir, night));
  });

  return app;
}
