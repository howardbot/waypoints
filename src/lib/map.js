// Map page: every trip with coordinates as a dot, colored by readiness for your skills
// (or dark if you've done it). Leaflet is loaded from cdnjs by map.astro; tiles are
// OpenStreetMap's. /map/?trip=<id> opens on that trip.
import { LABEL } from '../data/meta.js';
import { readiness, STATE_LABEL, inMonth } from './recommend.js';
import { getSkills, getDone } from './store.js';
import { loadTrips } from './trip-data.js';

const COLORS = { ready: '#c2410c', guided: '#1e5a8a', goal: '#8a96a0', done: '#0f1d2a' };

function popup(trip, state, done) {
  const box = document.createElement('div');
  box.className = 'map-pop';
  const link = document.createElement('a');
  link.href = `/trips/${trip.id}/`;
  link.textContent = trip.title;
  const place = document.createElement('span');
  place.className = 'small';
  place.textContent = trip.place;
  const chain = document.createElement('span');
  chain.className = 'small mono';
  chain.textContent = `${trip.get.map(m => LABEL[m]).join(' · ')} → ${trip.do.map(a => LABEL[a]).join(' · ')}`;
  const status = document.createElement('span');
  status.className = 'small';
  status.textContent = done ? 'Done' : STATE_LABEL[state];
  box.append(link, place, chain, status);
  return box;
}

export async function initMap() {
  const L = window.L;
  const el = document.getElementById('trip-map');
  const count = document.getElementById('map-count');
  if (!el) return;
  if (!L) {
    count.textContent = "The map library didn't load; check your connection and reload.";
    return;
  }
  const selects = { get: document.getElementById('map-get'), do: document.getElementById('map-do'), month: document.getElementById('map-month') };
  const map = L.map(el, { worldCopyJump: true, minZoom: 2 }).setView([25, 5], 2);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 13,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  const markers = new Map();

  let trips;
  try {
    trips = (await loadTrips()).filter(t => t.coords);
  } catch {
    count.textContent = "Couldn't load the trips; try reloading the page.";
    return;
  }

  const render = () => {
    const skills = getSkills();
    const done = getDone();
    const want = { get: selects.get.value, do: selects.do.value, month: Number(selects.month.value) };
    layer.clearLayers();
    markers.clear();
    let shown = 0;
    for (const trip of trips) {
      if (want.get && !trip.get.includes(want.get)) continue;
      if (want.do && !trip.do.includes(want.do)) continue;
      if (!inMonth(trip, want.month)) continue;
      const state = readiness(trip.req, skills);
      const isDone = Boolean(done[trip.id]);
      const marker = L.circleMarker(trip.coords, {
        radius: 7,
        color: '#ffffff',
        weight: 2,
        fillColor: isDone ? COLORS.done : COLORS[state],
        fillOpacity: 0.95,
      }).bindPopup(popup(trip, state, isDone));
      marker.addTo(layer);
      markers.set(trip.id, marker);
      shown += 1;
    }
    count.textContent = `${shown} ${shown === 1 ? 'trip' : 'trips'} on the map`;
  };

  Object.values(selects).forEach(select => select.addEventListener('change', render));
  window.addEventListener('waypoints:change', render);
  render();

  const focus = new URLSearchParams(location.search).get('trip');
  const marker = focus && markers.get(focus);
  if (marker) {
    map.setView(marker.getLatLng(), 6, { animate: false });
    marker.openPopup();
  }
}
