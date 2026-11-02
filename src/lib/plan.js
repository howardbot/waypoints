// The multi-year plan: which month each trip goes in, what to watch out for, and months to
// suggest for trips not planned yet. Pure functions over the slim trips (/trips.json), shared
// by the planner, the trip page and the tests. The plan itself lives in the browser (store.js).
import { MONTH_NAMES, monthsText } from './season.js';
import { editionText } from './events.js';

export const PLAN_YEARS = 5;

const key = ({ year, month }) => year * 12 + month;
const startMonth = edition => ({ year: Number(edition.start.slice(0, 4)), month: Number(edition.start.slice(5, 7)) });
const pad = n => String(n).padStart(2, '0');
const tripName = trip => trip.short ?? trip.title;

/** "Sep 2027". */
export const monthLabel = ({ year, month }) => `${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`;

/** This month, from `today` (a Date, local time). */
export const thisMonth = (today = new Date()) => ({ year: today.getFullYear(), month: today.getMonth() + 1 });

/** `count` months starting at `from` ({ year, month }). */
export function monthsFrom(from, count) {
  return Array.from({ length: count }, (_, i) => {
    const n = from.month - 1 + i;
    return { year: from.year + Math.floor(n / 12), month: (n % 12) + 1 };
  });
}

/** A trip's event editions that start in the given month, with the event's name. */
export function editionsIn(trip, month) {
  return (trip.events ?? []).flatMap(e =>
    e.editions.filter(ed => key(startMonth(ed)) === key(month)).map(ed => ({ ...ed, name: e.name })),
  );
}

/**
 * Months the trip fits, soonest first: its event months if it has dated events, otherwise its
 * best months from the month after `from`, leaving time to get ready.
 */
export function fittingMonths(trip, from) {
  const window = monthsFrom(from, PLAN_YEARS * 12);
  if (trip.events?.length) {
    const starts = new Set(trip.events.flatMap(e => e.editions.map(ed => key(startMonth(ed)))));
    return window.filter(m => starts.has(key(m)));
  }
  return window.slice(1).filter(m => trip.months.includes(m.month));
}

/** The days a planned trip takes: its event's dates in that month, or null for "sometime that month". */
function span(trip, entry) {
  const edition = editionsIn(trip, entry)[0];
  return edition ? [edition.start, edition.end] : null;
}

/**
 * Other planned trips in the same month, split into clashes and trips that fit around it.
 * Two dated events only clash when their dates overlap; any trip without dates takes the month.
 */
function sameMonth(trip, entry, plan, byId) {
  const mine = span(trip, entry);
  const clash = [];
  const also = [];
  for (const [id, other] of Object.entries(plan)) {
    const otherTrip = byId.get(id);
    if (id === trip.id || !otherTrip || key(other) !== key(entry)) continue;
    const theirs = span(otherTrip, other);
    const overlap = !mine || !theirs || (mine[0] <= theirs[1] && theirs[0] <= mine[1]);
    (overlap ? clash : also).push(otherTrip);
  }
  return { clash, also };
}

/** The soonest month that fits the trip without clashing with the plan, else the soonest fit. */
export function suggestMonth(trip, plan, from, byId) {
  const fits = fittingMonths(trip, from);
  return fits.find(m => sameMonth(trip, m, plan, byId).clash.length === 0) ?? fits[0] ?? from;
}

/**
 * Months for trips that aren't planned yet, avoiding clashes where possible. Trips with the
 * fewest options go first (dated events, then short seasons); ties keep the order given.
 */
export function suggestPlan(trips, plan, from, byId) {
  const added = {};
  const order = trips
    .filter(t => !plan[t.id])
    .map(t => ({ t, n: fittingMonths(t, from).length }))
    .sort((a, b) => a.n - b.n);
  for (const { t } of order) added[t.id] = suggestMonth(t, { ...plan, ...added }, from, byId);
  return added;
}

/**
 * What to know about a planned month: the trip's event dates in it, other trips that clash with
 * it or share the month, and whether it misses the event or the trip's best months.
 * [{ kind: 'event' | 'also' | 'busy' | 'off', text }]
 */
export function planNotes(trip, entry, plan, byId) {
  const notes = editionsIn(trip, entry).map(ed => ({ kind: 'event', text: `${ed.name}: ${editionText(ed)}` }));
  if (!notes.length && trip.events?.length) {
    const editions = trip.events.flatMap(e => e.editions.map(ed => ({ ...ed, name: e.name })));
    const near = editions.find(ed => startMonth(ed).year === entry.year) ?? editions.find(ed => key(startMonth(ed)) > key(entry));
    if (near) notes.push({ kind: 'off', text: `${near.name} is ${editionText(near)}` });
  } else if (!notes.length && !trip.months.includes(entry.month)) {
    notes.push({ kind: 'off', text: `Outside its best months (${monthsText(trip.months)})` });
  }
  const { clash, also } = sameMonth(trip, entry, plan, byId);
  if (clash.length) {
    const dated = span(trip, entry) && clash.every(t => span(t, plan[t.id]));
    notes.push({ kind: 'busy', text: `${dated ? 'Overlaps' : 'Same month as'} ${clash.map(tripName).join(', ')}` });
  }
  if (also.length) notes.push({ kind: 'also', text: `Also this month, on other days: ${also.map(tripName).join(', ')}` });
  return notes;
}

/**
 * Calendar entries for a plan (see ics.js): the event dates when the trip's event falls in its
 * month, otherwise a reminder on the 1st of the month.
 */
export function planEvents(plan, byId, origin = '') {
  return Object.entries(plan).flatMap(([id, entry]) => {
    const trip = byId.get(id);
    if (!trip) return [];
    const url = origin ? `${origin}/trips/${id}/` : '';
    const editions = editionsIn(trip, entry);
    if (editions.length) {
      return editions.map((ed, i) => ({
        uid: `plan-${id}-${i}@waypoints`,
        start: ed.start,
        end: ed.end,
        summary: `${ed.name}${ed.estimated ? ' (estimated dates)' : ''}`,
        description: `${trip.title}.${ed.estimated ? ' Dates estimated from the usual pattern; check the organizer.' : ''}`,
        url,
      }));
    }
    const first = `${entry.year}-${pad(entry.month)}-01`;
    return [{
      uid: `plan-${id}@waypoints`,
      start: first,
      end: first,
      summary: `Plan: ${tripName(trip)}`,
      description: `${trip.title}. Planned for ${MONTH_NAMES[entry.month - 1]} ${entry.year}; best months ${monthsText(trip.months)}.`,
      url,
    }];
  });
}
