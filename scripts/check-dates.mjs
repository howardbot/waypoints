// Look for newly announced event dates on organizers' pages and write src/data/date-watch.json
// for /status/ and the trip pages (see src/lib/date-watch.js). The server runs this before
// every build; it takes a few seconds and needs no keys.
//
//   dates      the page shows the year next to a month and day: probably announced
//   mentioned  the year appears near the event's name, but no dates yet
//   none       nothing about that year yet
//   blocked    the site refuses automated checks (any 4xx but 404/410): check it in a browser
//   gone       404 or 410: the event moved its page
//   error      timeouts, DNS, server errors
import { writeFile } from 'node:fs/promises';
import { datesToWatch, pageText, findDateMentions } from '../src/lib/date-watch.js';

const OUT = new URL('../src/data/date-watch.json', import.meta.url);
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const watch = datesToWatch();
const pages = new Map();
for (const url of new Set(watch.map(w => w.url))) {
  pages.set(
    url,
    fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,*/*;q=0.8' }, signal: AbortSignal.timeout(20000) })
      .then(async res => ({ code: res.status, text: res.ok ? pageText(await res.text()) : '' }))
      .catch(err => ({ code: 0, error: String(err.cause?.code ?? err.name) })),
  );
}

const results = [];
for (const w of watch) {
  const page = await pages.get(w.url);
  let status;
  let quotes = [];
  if (page.code >= 200 && page.code < 300) {
    const { dates, mentions } = findDateMentions(page.text, w.year, { near: w.near });
    status = dates.length ? 'dates' : mentions.length ? 'mentioned' : 'none';
    quotes = dates.length ? dates : mentions;
  } else {
    status = [404, 410].includes(page.code) ? 'gone' : page.code >= 400 && page.code < 500 ? 'blocked' : 'error';
  }
  results.push({ id: w.id, name: w.name, year: w.year, url: w.url, status, quotes, ...(page.code ? {} : { detail: page.error }) });
}

await writeFile(OUT, `${JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)}\n`);
const count = status => results.filter(r => r.status === status).length;
console.log(`Dates: ${results.length} events checked; ${count('dates')} with possible new dates, ${count('mentioned')} mentioned, ${count('blocked')} blocked`);
