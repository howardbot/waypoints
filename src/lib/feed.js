// Build-time only. The /calendar.ics feed: every dated event in the next five years, confirmed
// or estimated. Each edition keeps its UID, so when an estimate becomes a real date (in
// events.js), subscribed calendars move the event rather than adding a copy.
import { TRIPS } from '../data/trips.js';
import { EVENTS } from '../data/events.js';
import { upcoming } from './events.js';

/** `site` is the site's own address, for links back to the trips; without it, no links. */
export function feedEvents(today = new Date(), site = '') {
  const origin = site.replace(/\/$/, '');
  return Object.keys(EVENTS).flatMap(id => {
    const trip = TRIPS.find(t => t.id === id);
    return upcoming(id, today, 6).flatMap((event, i) =>
      event.editions.map(ed => ({
        uid: `${id}-${i}-${ed.start.slice(0, 4)}@waypoints`,
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
