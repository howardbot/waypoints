// Refresh src/data/videos.json with top YouTube results for each trip's `youtube` search terms.
//
//   npm run videos            (prompts for the key; see scripts/videos.sh)
//
// Uses the free YouTube Data API v3. Each search costs 100 of the default
// 10,000 daily quota units, so each run spends at most MAX_SEARCHES searches:
// trips with no videos first, then trips whose videos are older than
// STALE_DAYS. Run it daily and every trip stays fresh, however many there are.
// When each trip was last fetched is kept in src/data/videos-fetched.json.
import { readFile, writeFile } from 'node:fs/promises';
import { TRIPS } from '../src/data/trips.js';
import { parseSearch, keepVideos } from '../src/lib/youtube.js';

const PER_TERM = 3;
const MAX_SEARCHES = Number(process.env.MAX_SEARCHES ?? 80);
const STALE_DAYS = Number(process.env.STALE_DAYS ?? 7);
const VIDEOS_FILE = new URL('../src/data/videos.json', import.meta.url);
const FETCHED_FILE = new URL('../src/data/videos-fetched.json', import.meta.url);

const key = process.env.YOUTUBE_API_KEY;
if (!key) {
  console.error('Set YOUTUBE_API_KEY to a YouTube Data API v3 key, e.g. YOUTUBE_API_KEY=... npm run videos');
  process.exit(1);
}

const readJson = async url => {
  try {
    return JSON.parse(await readFile(url, 'utf8'));
  } catch {
    return {};
  }
};

async function search(q) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: String(PER_TERM),
    q,
    key,
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    relevanceLanguage: 'en',
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) throw new Error(`YouTube API ${res.status} for "${q}": ${(await res.text()).slice(0, 300)}`);
  return parseSearch(await res.json());
}

const oldVideos = await readJson(VIDEOS_FILE);
const oldFetched = await readJson(FETCHED_FILE);
const videos = {};
const fetched = {};
for (const trip of TRIPS) {
  if (oldVideos[trip.id]) videos[trip.id] = oldVideos[trip.id];
  if (oldFetched[trip.id]) fetched[trip.id] = oldFetched[trip.id];
}

const staleBefore = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
const due = TRIPS.filter(t => t.youtube?.length && !(Date.parse(fetched[t.id]) > staleBefore)).sort(
  (a, b) => (Date.parse(fetched[a.id]) || 0) - (Date.parse(fetched[b.id]) || 0),
);

let budget = MAX_SEARCHES;
let refreshed = 0;
let stoppedBy = null;
for (const trip of due) {
  if (trip.youtube.length > budget) break;
  budget -= trip.youtube.length;
  const seen = new Set();
  const list = [];
  try {
    for (const term of trip.youtube) {
      for (const video of keepVideos(trip, await search(term))) {
        if (seen.has(video.id)) continue;
        seen.add(video.id);
        list.push(video);
      }
    }
  } catch (err) {
    // Usually the daily quota running out. Keep what this run already fetched.
    stoppedBy = err.message;
    break;
  }
  videos[trip.id] = list;
  fetched[trip.id] = new Date().toISOString();
  refreshed += 1;
  console.log(`${trip.id}: ${list.length} videos`);
}

await writeFile(VIDEOS_FILE, `${JSON.stringify(videos, null, 2)}\n`);
await writeFile(FETCHED_FILE, `${JSON.stringify(fetched, null, 2)}\n`);
const waiting = due.length - refreshed;
console.log(
  `Refreshed ${refreshed} trips` +
    (waiting ? `; ${waiting} more due, the next run picks them up` : '; every trip is up to date'),
);
if (stoppedBy) {
  console.error(`Stopped early: ${stoppedBy}`);
  if (refreshed === 0) process.exit(1);
}
