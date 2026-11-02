// Build-time only. The slim trip records published as /trips.json, which the browser uses
// for Discover, the home page, the logbook and the map: just what cards, ranking, search
// and the map need, so those pages don't download the whole catalog.
import { TRIPS } from '../data/trips.js';
import { PHOTOS } from '../data/photos.js';
import { COORDS } from '../data/coords.js';
import { tripMonths } from './season.js';
import { localize } from './local-photo.js';

export function compactTrip(trip) {
  const coords = COORDS[trip.id] ?? null;
  const photo = trip.image ? null : localize(PHOTOS[trip.id]);
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
  };
}

export const compactTrips = () => TRIPS.map(compactTrip);
