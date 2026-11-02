// Home page "In season now": four trips that are good this month, best for your skills
// first. Ties rotate daily so the picks change from day to day.
import { recommend } from './recommend.js';
import { getSkills } from './store.js';
import { loadTrips } from './trip-data.js';
import { tripCard } from './cards.js';
import { syncAll } from './client.js';
import { MONTH_NAMES } from './season.js';

const SHOW = 4;

// Small string hash, so the same trips stay picked all day.
function hash(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export async function initInSeason() {
  const box = document.querySelector('.js-season-cards');
  if (!box) return;
  const now = new Date();
  const month = now.getMonth() + 1;
  const name = MONTH_NAMES[month - 1];
  document.querySelector('.js-season-title').textContent = `Good to go in ${name}`;
  document.querySelector('.js-season-link').href = `/discover/?get=&do=&month=${month}`;
  document.querySelector('.js-season-link').textContent = `See all for ${name} →`;

  let trips;
  try {
    trips = await loadTrips();
  } catch {
    box.closest('section').hidden = true;
    return;
  }
  const render = () => {
    const prefs = { get: [], do: [], region: 'any', month, q: '', surprise: true, tab: 'all' };
    const day = now.toISOString().slice(0, 10);
    const picks = recommend(trips, prefs, getSkills())
      .results.sort((a, b) => b.score - a.score || hash(day + a.trip.id) - hash(day + b.trip.id))
      .slice(0, SHOW);
    box.replaceChildren(...picks.map(r => tripCard(r.trip)));
    box.removeAttribute('aria-busy');
    syncAll();
  };
  window.addEventListener('waypoints:change', render);
  render();
}
