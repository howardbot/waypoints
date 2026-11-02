// Download every trip photo size from Wikimedia Commons into a folder, so the site can serve
// the photos itself (see src/lib/local-photo.js). Only missing files are fetched, slowly
// and with a descriptive User-Agent, as Wikimedia asks. The server runs this on each build.
//
//   node scripts/fetch-photos.mjs [folder]     (default: public/photos/commons)
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { PHOTOS } from '../src/data/photos.js';
import { photoFile, photoUrls } from '../src/lib/local-photo.js';

const DIR = process.argv[2] ?? 'public/photos/commons';
const MAX = Number(process.env.MAX_PHOTOS ?? 900);
const PAUSE_MS = 200;
const UA = 'WaypointsPersonalSite/0.1 (https://github.com/howardbot/waypoints)';

const exists = path => access(path).then(() => true, () => false);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

await mkdir(DIR, { recursive: true });
const urls = [...new Set(Object.values(PHOTOS).flatMap(photoUrls))];
let fetched = 0;
let failed = 0;
for (const url of urls) {
  const path = join(DIR, photoFile(url));
  if (await exists(path)) continue;
  if (fetched + failed >= MAX) break;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000) });
    if (!res.ok || !String(res.headers.get('content-type')).startsWith('image/')) throw new Error(`HTTP ${res.status}`);
    await writeFile(path, Buffer.from(await res.arrayBuffer()));
    fetched += 1;
  } catch (err) {
    failed += 1;
    console.error(`${url}: ${err.message}`);
  }
  await sleep(PAUSE_MS);
}
const have = (await Promise.all(urls.map(u => exists(join(DIR, photoFile(u)))))).filter(Boolean).length;
console.log(`Photos: ${have} of ${urls.length} files local (${fetched} new, ${failed} failed)`);
