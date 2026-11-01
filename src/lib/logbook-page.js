// Logbook page: tap a step to set your level, and list the trips you saved.
import { TRIPS } from '../data/trips.js';
import { getSaved, getSkills, setSkill } from './store.js';
import { readiness, STATE_LABEL } from './recommend.js';

function savedRow(trip, state) {
  const row = document.createElement('a');
  row.className = 'row';
  row.href = `/trips/${trip.id}/`;
  const title = document.createElement('span');
  title.className = 'row-main';
  title.textContent = trip.title;
  const place = document.createElement('span');
  place.className = 'row-meta';
  place.textContent = trip.place;
  const status = document.createElement('span');
  status.className = 'row-state';
  status.dataset.state = state;
  status.textContent = STATE_LABEL[state].toUpperCase();
  row.append(title, place, status);
  return row;
}

export function initLogbook() {
  document.addEventListener('click', event => {
    const step = event.target instanceof Element ? event.target.closest('button.step[data-level]') : null;
    const track = step?.closest('[data-track]');
    if (step && track) setSkill(track.dataset.track, step.dataset.level);
  });

  const list = document.querySelector('.js-wishlist');
  const empty = document.querySelector('.js-wishlist-empty');
  if (!list || !empty) return;
  const render = () => {
    const skills = getSkills();
    const saved = getSaved().map(id => TRIPS.find(t => t.id === id)).filter(Boolean);
    list.replaceChildren(...saved.map(trip => savedRow(trip, readiness(trip.req, skills))));
    list.hidden = saved.length === 0;
    empty.hidden = saved.length > 0;
  };
  window.addEventListener('waypoints:change', render);
  window.addEventListener('storage', render);
  render();
}
