// Loads /trips.json (the slim trip list) once per page; the browser caches it across pages.
let pending = null;

export function loadTrips() {
  pending ??= fetch('/trips.json').then(res => {
    if (!res.ok) throw new Error(`trips.json: ${res.status}`);
    return res.json();
  });
  return pending;
}
