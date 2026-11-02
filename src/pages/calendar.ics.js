// /calendar.ics, rebuilt daily on the server. SITE_URL (the server sets it, see deploy/refresh.sh)
// adds links back to the trips.
import { feedEvents } from '../lib/feed.js';
import { calendar } from '../lib/ics.js';

export function GET() {
  const events = feedEvents(new Date(), process.env.SITE_URL ?? '');
  return new Response(calendar({ name: 'Waypoints events', events }), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}
