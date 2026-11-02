// Build-time only. The slim trip records published as /trips.json, which the browser uses
// for Discover, the home page, the logbook, the map and the planner: just what cards, ranking,
// search, the map and planning need, so those pages don't download the whole catalog.
import { TRIPS } from '../data/trips.js';
import { PHOTOS } from '../data/photos.js';
import { COORDS } from '../data/coords.js';
import { tripMonths } from './season.js';
import { localize } from './local-photo.js';
import { upcoming } from './events.js';

export function compactTrip(trip, today = new Date()) {
  const coords = COORDS[trip.id] ?? null;
  const photo = trip.image ? null : localize(PHOTOS[trip.id]);
  const events = upcoming(trip.id, today, 6); // every edition in the planning window
  return {
    id: trip.id,
    title: trip.title,
    short: trip.short,
    place: trip.place,
    season: trip.season,
    length: trip.length,
    region: trip.region,
    get: trip.get,
    do: trip.do,
    req: trip.req ?? null,
    notes: trip.notes,
    isNew: Boolean(trip.isNew),
    months: tripMonths(trip, coords?.[0]),
    coords,
    label: trip.photo ?? trip.short,
    tone: trip.tone,
    image: trip.image ?? null,
    photo: photo ? { src: photo.src, srcset: photo.srcset, alt: photo.alt } : null,
    ...(events.length ? { events } : {}),
  };
}

export const compactTrips = (today = new Date()) => TRIPS.map(t => compactTrip(t, today));
