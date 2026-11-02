// Calendar feeds: every dated event in the next five years, confirmed or estimated, built into
// /calendar.ics, and the same with your plan in it, served by the sync server as
// /api/calendar.ics. Each edition keeps its UID, so when an estimate becomes a real date (in
// events.js), subscribed calendars move the event rather than adding a copy.
import { TRIPS } from '../data/trips.js';
import { EVENTS } from '../data/events.js';
import { upcoming } from './events.js';
import { editionsIn, planEvents } from './plan.js';

/** `site` is the site's own address, for links back to the trips; without it, no links. */
export function feedEvents(today = new Date(), site = '') {
  const origin = site.replace(/\/$/, '');
  return Object.keys(EVENTS).flatMap(id => {
    const trip = TRIPS.find(t => t.id === id);
    return upcoming(id, today, 6).flatMap((event, i) =>
      event.editions.map(ed => ({
        uid: `${id}-${i}-${ed.start.slice(0, 4)}@waypoints`,
        tripId: id,
        start: ed.start,
        end: ed.end,
        summary: `${event.name}${ed.estimated ? ' (estimated)' : ''}`,
        description: ed.estimated
          ? `${trip.title}. Estimated: it's usually ${event.usually}. Check the organizer before you book.`
          : `${trip.title}. Dates confirmed by the organizer.`,
        url: origin ? `${origin}/trips/${id}/` : '',
      })),
    );
  });
}

/**
 * The feed with your plan in it: events you planned get "Planned:" in front, and trips without
 * dates get a reminder on the 1st of their month. `byId` maps trip ids to slim trips.
 */
export function withPlan(events, plan, byId, site = '') {
  const planned = new Set();
  const reminders = {};
  for (const [id, entry] of Object.entries(plan)) {
    const trip = byId.get(id);
    if (!trip) continue;
    const editions = editionsIn(trip, entry);
    if (editions.length) editions.forEach(ed => planned.add(`${id} ${ed.start}`));
    else reminders[id] = entry;
  }
  return [
    ...events.map(e => (planned.has(`${e.tripId} ${e.start}`) ? { ...e, summary: `Planned: ${e.summary}` } : e)),
    ...planEvents(reminders, byId, site.replace(/\/$/, '')),
  ];
}
