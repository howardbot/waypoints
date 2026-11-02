// Waypoints sync server: keeps each person's saved state (skills, wishlist, plan, logbook,
// videos) so all their devices share it, and serves their calendar feed with their plan in it.
// It runs in a container next to the site (docker-compose.yml); nginx sends /api/ here, so it's
// reachable only from your tailnet, like the site. Tailscale Serve says who is asking with the
// Tailscale-User-Login header; requests without it (say, from a tagged device) share one state.
//
//   GET  /api/sync           { fields, user }
//   POST /api/sync           send { fields }, get the merged { fields, user } (src/lib/sync-merge.js)
//   GET  /api/calendar.ics   every dated event, with your plan in it
//
// No dependencies; state is one small JSON file per person in DATA_DIR.
import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { cleanFields, mergeFields } from '../../src/lib/sync-merge.js';
import { feedEvents, withPlan } from '../../src/lib/feed.js';
import { compactTrips } from '../../src/lib/compact.js';
import { calendar } from '../../src/lib/ics.js';

const MAX_BODY_BYTES = 300_000;

class HttpError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413);
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400);
  }
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const isMonth = v => Number.isInteger(v?.year) && Number.isInteger(v?.month) && v.month >= 1 && v.month <= 12;

/** The plan in a person's fields: { tripId: { year, month } }. */
export function planOf(fields) {
  return Object.fromEntries(
    Object.entries(fields)
      .filter(([field, entry]) => field.startsWith('plan.') && isMonth(entry.v))
      .map(([field, entry]) => [field.slice('plan.'.length), { year: entry.v.year, month: entry.v.month }]),
  );
}

export function createSyncServer({ dataDir, site = '' }) {
  const fileFor = user => join(dataDir, `${createHash('sha256').update(user || 'shared').digest('hex').slice(0, 32)}.json`);

  async function load(user) {
    try {
      return JSON.parse(await readFile(fileFor(user), 'utf8')).fields ?? {};
    } catch {
      return {};
    }
  }

  async function save(user, fields) {
    const file = fileFor(user);
    await writeFile(`${file}.tmp`, JSON.stringify({ fields }));
    await rename(`${file}.tmp`, file); // never leaves a half-written file
  }

  // One merge at a time per person, so two devices syncing at once can't drop each other's changes.
  const queues = new Map();
  function oneAtATime(user, task) {
    const run = (queues.get(user) ?? Promise.resolve()).then(task);
    queues.set(user, run.catch(() => {}));
    return run;
  }

  // Trips for the feed change only with a new build (which restarts this server), so cache a day.
  let trips = null;
  const tripsById = () => {
    if (!trips || Date.now() - trips.at > 86_400_000) trips = { at: Date.now(), byId: new Map(compactTrips().map(t => [t.id, t])) };
    return trips.byId;
  };

  return createServer(async (req, res) => {
    const user = String(req.headers['tailscale-user-login'] ?? '').slice(0, 200);
    const { pathname } = new URL(req.url, 'http://localhost');
    try {
      if (pathname === '/api/sync' && req.method === 'GET') {
        return send(res, 200, { fields: await load(user), user: user || null });
      }
      if (pathname === '/api/sync' && req.method === 'POST') {
        const incoming = cleanFields((await readJson(req))?.fields);
        if (!incoming) throw new HttpError(400);
        const fields = await oneAtATime(user, async () => {
          const merged = mergeFields(await load(user), incoming);
          await save(user, merged);
          return merged;
        });
        return send(res, 200, { fields, user: user || null });
      }
      if (pathname === '/api/calendar.ics' && req.method === 'GET') {
        const events = withPlan(feedEvents(new Date(), site), planOf(await load(user)), tripsById(), site);
        return send(res, 200, calendar({ name: 'Waypoints', events }), 'text/calendar; charset=utf-8');
      }
      throw new HttpError(404);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      send(res, status, { error: status === 404 ? 'not found' : status === 500 ? 'server error' : 'bad request' });
    }
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dataDir = process.env.DATA_DIR ?? '/data';
  await mkdir(dataDir, { recursive: true });
  const port = Number(process.env.PORT ?? 8080);
  createSyncServer({ dataDir, site: process.env.SITE_URL ?? '' }).listen(port, () => console.log(`Waypoints sync on :${port}`));
}
