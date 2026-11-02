// /trips.json: the slim trip list the browser-side pages load once and cache.
import { compactTrips } from '../lib/compact.js';

export function GET() {
  return new Response(JSON.stringify(compactTrips()), { headers: { 'Content-Type': 'application/json' } });
}
