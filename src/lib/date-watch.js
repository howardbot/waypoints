// Spotting newly announced event dates: for each event whose next edition is only an estimate,
// look on the organizer's page (`check` in events.js) for that year written next to a month and
// a day, like "September 9-12th, 2027", "30 & 31 January 2027" or "16 – 18.3.2027". Hits show
// on /status/ and the trip page so the dates can be confirmed and added to events.js.
// scripts/check-dates.mjs runs it on every server build.
import { EVENTS } from '../data/events.js';
import { upcoming } from './events.js';

const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\b';
const DAY = '\\b\\d{1,2}(?:st|nd|rd|th)?\\.?';
const NEAR = '[^.!?\\n]{0,40}?';
const datePatterns = year => [
  `\\b${MONTH}\\.?${NEAR}${DAY}${NEAR}\\b${year}\\b`, // September 9-12th, 2027
  `${DAY}${NEAR}\\b${MONTH}${NEAR}\\b${year}\\b`, // 30 & 31 January 2027, 6 - 12. Apr 2027
  `\\b${year}\\b${NEAR}\\b${MONTH}\\.?${NEAR}${DAY}`, // Supercon 2027, November 5 to 7
  `\\b\\d{1,2}[./]\\d{1,2}[./]${year}\\b`, // 16 – 18.3.2027, 10/01/2027
  `\\b${year}-[01]\\d-[0-3]\\d\\b`, // 2027-09-20
];

const ENTITIES = { amp: '&', nbsp: ' ', ndash: '–', mdash: '—', quot: '"', apos: "'", lt: '<', gt: '>', rsquo: '’', lsquo: '‘' };

/** A page's visible text: tags, scripts and styles dropped, entities decoded, spaces squeezed. */
export function pageText(html) {
  return html
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
      if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? whole;
      return String.fromCodePoint(code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
    })
    .replace(/[ \t\r\f\v\u00a0]+/g, ' ')
    .replace(/ *\n[\s]*/g, '\n');
}

// The parts of a page about the event: around each mention of `near`, or the whole page.
function sections(text, near) {
  if (!near) return [text];
  const found = [];
  const lower = text.toLowerCase();
  for (let i = lower.indexOf(near.toLowerCase()); i !== -1; i = lower.indexOf(near.toLowerCase(), i + 1)) {
    found.push(text.slice(Math.max(0, i - 150), i + near.length + 250));
  }
  return found;
}

// A short quote around a match, ending on whole words, with … where it was cut.
function quoteAround(text, index, length) {
  let start = Math.max(0, index - 40);
  let end = Math.min(text.length, index + length + 40);
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  while (end < text.length && !/\s/.test(text[end])) end++;
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`;
}

/**
 * What a page says about `year`: `dates`, short quotes where the year sits next to a month and a
 * day, and `mentions`, quotes where the year appears near the event's name (`near`) with no date.
 * Only the parts of the page around `near` are read, when it's given.
 */
export function findDateMentions(text, year, { near = '', max = 3 } = {}) {
  const dates = [];
  const mentions = [];
  for (const part of sections(text, near)) {
    for (const pattern of datePatterns(year)) {
      for (const match of part.matchAll(new RegExp(pattern, 'gi'))) {
        const quote = quoteAround(part, match.index, match[0].length);
        if (/©|copyright/i.test(quote) || dates.some(q => q.includes(match[0].trim()) || quote.includes(q))) continue;
        if (dates.length < max) dates.push(quote);
      }
    }
    if (!near) continue;
    for (const match of part.matchAll(new RegExp(`\\b${year}\\b`, 'g'))) {
      const quote = quoteAround(part, match.index, 4);
      if (!/©|copyright/i.test(quote) && mentions.length < max && !mentions.includes(quote)) mentions.push(quote);
    }
  }
  return { dates, mentions: dates.length ? [] : mentions };
}

/**
 * The checks to make: one per event that has an organizer page and an estimated edition coming
 * up, looking for that edition's year. [{ id, name, year, url, near }]
 */
export function datesToWatch(today = new Date()) {
  return Object.entries(EVENTS).flatMap(([id, list]) =>
    list
      .map((event, i) => ({ event, next: upcoming(id, today, 6)[i].editions.find(ed => ed.estimated) }))
      .filter(({ event, next }) => event.check && next)
      .map(({ event, next }) => ({ id, name: event.name, year: Number(next.start.slice(0, 4)), url: event.check.url, near: event.check.near ?? '' })),
  );
}
