// Upcoming dates for trips with dated events (src/data/events.js): confirmed dates first,
// then estimates from each event's yearly pattern, so a trip can be planned years ahead.
import { EVENTS } from '../data/events.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_MS = 86_400_000;
const HORIZON_YEARS = 5; // estimate no further ahead than this
const parts = iso => iso.split('-').map(Number);
const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const toDate = iso => utc(...parts(iso));
const isoDay = date => date.toISOString().slice(0, 10);
const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);

/** "Sep 21–27, 2026", "Jun 22 – Jul 3, 2026", "Dec 21, 2026 – Mar 10, 2027". */
export function formatRange(start, end = start) {
  const [y1, m1, d1] = parts(start);
  const [y2, m2, d2] = parts(end);
  if (start === end) return `${MON[m1 - 1]} ${d1}, ${y1}`;
  if (y1 !== y2) return `${MON[m1 - 1]} ${d1}, ${y1} – ${MON[m2 - 1]} ${d2}, ${y2}`;
  if (m1 !== m2) return `${MON[m1 - 1]} ${d1} – ${MON[m2 - 1]} ${d2}, ${y1}`;
  return `${MON[m1 - 1]} ${d1}–${d2}, ${y1}`;
}

/** An event's yearly rule: its own `repeats`, or the weekday and week of the month of its latest date. */
export function ruleFor(event) {
  if (event.repeats) return event.repeats;
  const [start, end] = event.dates.at(-1);
  const s = toDate(start);
  const nth = Math.ceil(s.getUTCDate() / 7);
  return {
    month: s.getUTCMonth() + 1,
    weekday: WEEKDAYS[s.getUTCDay()],
    nth: nth > 4 ? -1 : nth,
    days: (toDate(end) - s) / DAY_MS + 1,
  };
}

/** Where a rule puts the event in `year`, as [start, end] ISO dates. */
export function datesIn(rule, year) {
  let start;
  if (rule.day) {
    start = utc(year, rule.month, rule.day);
  } else {
    const weekday = WEEKDAYS.indexOf(rule.weekday);
    if (rule.nth > 0) {
      const first = utc(year, rule.month, 1);
      start = addDays(first, ((weekday - first.getUTCDay() + 7) % 7) + (rule.nth - 1) * 7);
    } else {
      const last = utc(year, rule.month + 1, 0);
      start = addDays(last, -((last.getUTCDay() - weekday + 7) % 7));
    }
    start = addDays(start, rule.offset ?? 0);
  }
  return [isoDay(start), isoDay(addDays(start, rule.days - 1))];
}

/**
 * The next `count` editions of each of a trip's events, from `today` (a Date):
 * [{ name, usually, editions: [{ start, end, estimated }] }]. Empty for trips without events.
 */
export function upcoming(tripId, today = new Date(), count = 3) {
  const day = isoDay(today);
  return (EVENTS[tripId] ?? []).map(event => {
    const editions = event.dates.filter(([, end]) => end >= day).map(([start, end]) => ({ start, end, estimated: false }));
    const rule = ruleFor(event);
    const every = event.every ?? 1;
    const lastYear = today.getUTCFullYear() + HORIZON_YEARS;
    for (let year = parts(event.dates.at(-1)[0])[0] + every; editions.length < count && year <= lastYear; year += every) {
      const [start, end] = datesIn(rule, year);
      if (end >= day) editions.push({ start, end, estimated: !event.official });
    }
    return { name: event.name, usually: event.usually, editions: editions.slice(0, count) };
  });
}

/** "Sep 20–26, 2027", or "About Sep 18–24, 2028" for an estimate. */
export function editionText(edition) {
  const range = formatRange(edition.start, edition.end);
  return edition.estimated ? `About ${range}` : range;
}

/** Events whose next edition is only an estimate, for /status/: worth checking for announced dates. */
export function estimatedEvents(today = new Date()) {
  return Object.keys(EVENTS).flatMap(id =>
    upcoming(id, today, 1)
      .filter(e => e.editions[0]?.estimated)
      .map(e => ({ id, name: e.name, next: e.editions[0] })),
  );
}
