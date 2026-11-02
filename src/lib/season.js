// Turns a trip's free-text season ("April–June", "Mar–May and Oct–Nov", "Spring and fall",
// "Year-round") into the months it's good in, 1–12. Used by the month filter on Discover,
// "In season now" on the home page, and the map. Text the parser can't read gets an entry
// in src/data/months.js instead.
import { MONTHS_OVERRIDE } from '../data/months.js';

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const MONTH = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
const SEASON = 'spring|summer|autumn|fall|winter';
const EDGE = '(?:(early|mid|late)[- ])?';
const DAY = '(?: \\d{1,2})?';
const TO = '\\s*(?:–|-|to)\\s*';

const monthNumber = word => {
  const i = MONTH_NAMES.findIndex(m => m.toLowerCase().startsWith(word.toLowerCase().slice(0, 3)));
  return i + 1;
};

/** Months from a to b inclusive, wrapping past December (October–May works). */
export function monthRange(a, b) {
  const out = [];
  for (let m = a; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === b || out.length === 12) return out;
  }
}

// Meteorological seasons; south of the equator they're shifted by six months.
const SEASONS = { spring: [3, 4, 5], summer: [6, 7, 8], autumn: [9, 10, 11], fall: [9, 10, 11], winter: [12, 1, 2] };
function seasonMonths(word, south) {
  const months = SEASONS[word.toLowerCase()];
  return south ? months.map(m => ((m + 5) % 12) + 1) : months;
}
const edge = (months, which) => {
  const w = which?.toLowerCase();
  return w === 'late' ? [months[2]] : w === 'early' ? [months[0]] : months;
};

/** Parse season text into months (1–12, sorted). `south` flips the season words. */
export function parseSeason(text, south = false) {
  const s = String(text ?? '');
  if (/^\s*year-round/i.test(s) || /\bvar(?:y|ies)\b/i.test(s)) return monthRange(1, 12);
  const found = new Set();

  // Month names, ranges first ("June 1 – September 15", "mid-March to mid-June", "Oct–Apr").
  const monthRange_ = new RegExp(`${EDGE}\\b(${MONTH})\\b${DAY}${TO}${EDGE}\\b(${MONTH})\\b`, 'gi');
  let rest = s.replace(monthRange_, (_, _e1, a, _e2, b) => {
    monthRange(monthNumber(a), monthNumber(b)).forEach(m => found.add(m));
    return ' ';
  });
  for (const match of rest.matchAll(new RegExp(`\\b(${MONTH})\\b`, 'gi'))) found.add(monthNumber(match[1]));
  if (found.size) return [...found].sort((a, b) => a - b);

  // Season words ("Spring–autumn", "Late spring to autumn", "Spring and fall").
  const seasonRange = new RegExp(`${EDGE}\\b(${SEASON})\\b${TO}${EDGE}\\b(${SEASON})\\b`, 'gi');
  rest = s.replace(seasonRange, (_, e1, a, e2, b) => {
    const from = edge(seasonMonths(a, south), e1)[0];
    const toMonths = edge(seasonMonths(b, south), e2);
    monthRange(from, toMonths[toMonths.length - 1]).forEach(m => found.add(m));
    return ' ';
  });
  for (const match of rest.matchAll(new RegExp(`${EDGE}\\b(${SEASON})\\b`, 'gi'))) {
    edge(seasonMonths(match[2], south), match[1]).forEach(m => found.add(m));
  }
  return [...found].sort((a, b) => a - b);
}

/** "Year-round", "Apr–Jun", "Oct–Mar", "Mar–May, Sep–Nov". */
export function monthsText(months) {
  const set = new Set(months);
  if (set.size === 12) return 'Year-round';
  if (!set.size) return 'Check the trip';
  // Start counting at a month that follows a gap, so ranges can run past December.
  const start = [...set].sort((a, b) => a - b).find(m => !set.has(m === 1 ? 12 : m - 1));
  const runs = [];
  for (let i = 0, m = start; i < 12; i += 1, m = (m % 12) + 1) {
    if (!set.has(m)) continue;
    const last = runs[runs.length - 1];
    if (last && last[1] === (m === 1 ? 12 : m - 1)) last[1] = m;
    else runs.push([m, m]);
  }
  const short = m => MONTH_NAMES[m - 1].slice(0, 3);
  return runs.map(([a, b]) => (a === b ? short(a) : `${short(a)}–${short(b)}`)).join(', ');
}

/** The months a trip is good in. `lat` (from coords.js) decides the hemisphere. */
export function tripMonths(trip, lat = null) {
  if (MONTHS_OVERRIDE[trip.id]) return MONTHS_OVERRIDE[trip.id];
  return parseSeason(trip.season, typeof lat === 'number' && lat < 0);
}
