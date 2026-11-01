// Fill src/data/videos.json with top YouTube results for each trip's `youtube` search terms.
//
//   npm run videos            (prompts for the key; see scripts/videos.sh)
//
// Uses the free YouTube Data API v3 (create a key in Google Cloud). Each search
// costs 100 of the default 10,000 daily quota units; this makes one search per
// term, about 40 for the whole catalog. Commit the JSON; the key never leaves
// your machine or reaches the site.
import { writeFile } from 'node:fs/promises';
import { TRIPS } from '../src/data/trips.js';
import { parseSearch, keepVideos } from '../src/lib/youtube.js';

const PER_TERM = 3;
const key = process.env.YOUTUBE_API_KEY;
if (!key) {
  console.error('Set YOUTUBE_API_KEY to a YouTube Data API v3 key, e.g. YOUTUBE_API_KEY=... npm run videos');
  process.exit(1);
}

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

const videos = {};
for (const trip of TRIPS) {
  const seen = new Set();
  videos[trip.id] = [];
  for (const term of trip.youtube ?? []) {
    for (const video of keepVideos(trip, await search(term))) {
      if (seen.has(video.id)) continue;
      seen.add(video.id);
      videos[trip.id].push(video);
    }
  }
  console.log(`${trip.id}: ${videos[trip.id].length} videos`);
}

await writeFile(new URL('../src/data/videos.json', import.meta.url), `${JSON.stringify(videos, null, 2)}\n`);
console.log('Wrote src/data/videos.json');
