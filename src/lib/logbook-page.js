// Logbook page: tap a step to set your level, see the trips you've done (newest first,
// tallied by activity) and the trips you saved.
import { LABEL } from '../data/meta.js';
import { getSaved, getSkills, setSkill, getDone } from './store.js';
import { readiness, STATE_LABEL } from './recommend.js';
import { loadTrips } from './trip-data.js';

function row(trip, meta, state, stateText) {
  const link = document.createElement('a');
  link.className = 'row';
  link.href = `/trips/${trip.id}/`;
  const title = document.createElement('span');
  title.className = 'row-main';
  title.textContent = trip.title;
  const place = document.createElement('span');
  place.className = 'row-meta';
  place.textContent = meta;
  const status = document.createElement('span');
  status.className = 'row-state';
  if (state) status.dataset.state = state;
  status.textContent = stateText;
  link.append(title, place, status);
  return link;
}

const monthYear = iso =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase() : 'DONE';

export async function initLogbook() {
  document.addEventListener('click', event => {
    const step = event.target instanceof Element ? event.target.closest('button.step[data-level]') : null;
    const track = step?.closest('[data-track]');
    if (step && track) setSkill(track.dataset.track, step.dataset.level);
  });

  const wish = document.querySelector('.js-wishlist');
  const wishEmpty = document.querySelector('.js-wishlist-empty');
  const doneList = document.querySelector('.js-done-list');
  const doneEmpty = document.querySelector('.js-done-empty');
  const tally = document.querySelector('.js-done-tally');
  if (!wish || !doneList) return;

  let trips;
  try {
    trips = await loadTrips();
  } catch {
    return;
  }
  const byId = new Map(trips.map(t => [t.id, t]));

  const render = () => {
    const skills = getSkills();
    const saved = getSaved().map(id => byId.get(id)).filter(Boolean);
    wish.replaceChildren(...saved.map(trip => {
      const state = readiness(trip.req, skills);
      return row(trip, trip.place, state, STATE_LABEL[state].toUpperCase());
    }));
    wish.hidden = saved.length === 0;
    wishEmpty.hidden = saved.length > 0;

    const done = getDone();
    const doneTrips = Object.entries(done)
      .map(([id, entry]) => ({ trip: byId.get(id), entry }))
      .filter(d => d.trip)
      .sort((a, b) => String(b.entry.date).localeCompare(String(a.entry.date)));
    doneList.replaceChildren(...doneTrips.map(({ trip, entry }) => row(trip, entry.note || trip.place, null, monthYear(entry.date))));
    doneList.hidden = doneTrips.length === 0;
    doneEmpty.hidden = doneTrips.length > 0;

    const counts = new Map();
    for (const { trip } of doneTrips) for (const a of trip.do) counts.set(a, (counts.get(a) ?? 0) + 1);
    tally.replaceChildren(...[...counts].sort((a, b) => b[1] - a[1]).map(([a, n]) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = `${LABEL[a]} · ${n}`;
      return chip;
    }));
    tally.hidden = counts.size === 0;
  };
  window.addEventListener('waypoints:change', render);
  window.addEventListener('storage', render);
  render();
}
