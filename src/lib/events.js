// Next and last dates for trips with dated events (src/data/events.js).
import { EVENTS } from '../data/events.js';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const parts = iso => iso.split('-').map(Number);

/** "Sep 21–27, 2026", "Jun 22 – Jul 3, 2026", "Dec 21, 2026 – Mar 10, 2027". */
export function formatRange(start, end = start) {
  const [y1, m1, d1] = parts(start);
  const [y2, m2, d2] = parts(end);
  if (start === end) return `${MON[m1 - 1]} ${d1}, ${y1}`;
  if (y1 !== y2) return `${MON[m1 - 1]} ${d1}, ${y1} – ${MON[m2 - 1]} ${d2}, ${y2}`;
  if (m1 !== m2) return `${MON[m1 - 1]} ${d1} – ${MON[m2 - 1]} ${d2}, ${y1}`;
  return `${MON[m1 - 1]} ${d1}–${d2}, ${y1}`;
}

const isoDay = date => date.toISOString().slice(0, 10);

/** { next, last } events for a trip relative to `today` (a Date). Either may be null. */
export function eventStatus(tripId, today = new Date()) {
  const list = [...(EVENTS[tripId] ?? [])].sort((a, b) => a.start.localeCompare(b.start));
  const day = isoDay(today);
  return {
    next: list.find(e => e.end >= day) ?? null,
    last: [...list].reverse().find(e => e.end < day) ?? null,
  };
}

/** The "Dates" line for a trip page, or null if the trip has no dated events. */
export function datesLine(tripId, today = new Date()) {
  const { next, last } = eventStatus(tripId, today);
  if (next) return `${next.name}: ${formatRange(next.start, next.end)}`;
  if (last) return `Last held ${formatRange(last.start, last.end)}; check the organizer for the next dates`;
  return null;
}

/** Trips whose dates have all passed, for /status/. */
export function staleEvents(today = new Date()) {
  return Object.keys(EVENTS)
    .map(id => ({ id, ...eventStatus(id, today) }))
    .filter(e => !e.next && e.last);
}
