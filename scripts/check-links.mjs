// Check every trip source link and write src/data/link-status.json for the /status/ page.
// The server runs this monthly (waypoints-links.timer). No API keys involved.
//
//   ok       the page loaded
//   gone     404 or 410: the page moved or was removed, so the trip needs a new source
//   blocked  any other 4xx (401, 403, 405, 429, sites' own codes): the site refused an
//            automated check from a server, and the page usually opens fine in a browser
//   error    anything else (timeouts, DNS, server errors): worth a look
import { writeFile } from 'node:fs/promises';
import { TRIPS } from '../src/data/trips.js';

const OUT = new URL('../src/data/link-status.json', import.meta.url);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';
const CONCURRENCY = 6;

const byUrl = new Map();
for (const trip of TRIPS) {
  for (const s of trip.sources ?? []) {
    if (!byUrl.has(s.url)) byUrl.set(s.url, []);
    byUrl.get(s.url).push(trip.id);
  }
}

async function check(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
      signal: AbortSignal.timeout(25000),
    });
    res.body?.cancel().catch(() => {});
    const code = res.status;
    const status = res.ok ? 'ok' : [404, 410].includes(code) ? 'gone' : code >= 400 && code < 500 ? 'blocked' : 'error';
    return { status, code };
  } catch (err) {
    return { status: 'error', code: 0, detail: String(err.cause?.code ?? err.name ?? err.message) };
  }
}

const urls = [...byUrl.keys()];
const results = new Map();
let next = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (next < urls.length) {
      const url = urls[next++];
      results.set(url, await check(url));
    }
  }),
);

const counts = { ok: 0, blocked: 0, gone: 0, error: 0 };
const problems = [];
for (const url of urls) {
  const r = results.get(url);
  counts[r.status] += 1;
  if (r.status !== 'ok') problems.push({ url, trips: byUrl.get(url), ...r });
}
problems.sort((a, b) => a.status.localeCompare(b.status) || a.url.localeCompare(b.url));
await writeFile(OUT, `${JSON.stringify({ checkedAt: new Date().toISOString(), total: urls.length, counts, problems }, null, 2)}\n`);
console.log(`Links: ${urls.length} checked; ${counts.ok} ok, ${counts.blocked} blocked, ${counts.gone} gone, ${counts.error} errors`);
