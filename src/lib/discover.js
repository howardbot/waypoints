// Discover page: loads the slim trip list, ranks it for your picks and skills, and builds
// the cards for the best matches (18 at a time).
import { LABEL, MODES, ACTIVITIES, REGIONS } from '../data/meta.js';
import { recommend } from './recommend.js';
import { getSkills, setSkill } from './store.js';
import { loadTrips } from './trip-data.js';
import { tripCard } from './cards.js';
import { syncAll } from './client.js';

function readPrefs() {
  const params = new URLSearchParams(location.search);
  const list = (key, allowed) => (params.get(key) || '').split(',').filter(v => allowed.includes(v));
  const fromLink = ['get', 'do', 'q', 'month', 'region'].some(k => params.has(k));
  const region = params.get('region');
  const month = Number(params.get('month'));
  return {
    get: fromLink ? list('get', MODES) : ['fly'],
    do: fromLink ? list('do', ACTIVITIES) : ['camp'],
    region: REGIONS.some(r => r.id === region) ? region : 'any',
    month: month >= 1 && month <= 12 ? month : 0,
    q: params.get('q') || '',
    surprise: true,
    tab: 'all',
  };
}

function whyText(result, prefs) {
  const hits = result.hits.map(k => LABEL[k]);
  const picked = prefs.get.length + prefs.do.length > 0;
  const text = hits.length ? `Matches ${hits.join(' + ')}` : picked ? 'Outside your picks, shown for ideas' : 'Ranked by readiness';
  return prefs.surprise && result.trip.isNew ? `New to you · ${text}` : text;
}

export async function initDiscover() {
  const grid = document.getElementById('results');
  if (!grid) return;
  const empty = document.getElementById('empty');
  const summary = document.getElementById('summary');
  const search = document.getElementById('search');
  const region = document.getElementById('region');
  const month = document.getElementById('month');
  const surprise = document.getElementById('surprise');
  const skillSelects = [...document.querySelectorAll('select[data-skill]')];
  const more = document.getElementById('more');
  const PAGE = 18;
  const cards = new Map();
  let trips = [];
  let prefs = readPrefs();
  let limit = PAGE;

  const cardFor = trip => {
    if (!cards.has(trip.id)) cards.set(trip.id, tripCard(trip, { match: true }));
    return cards.get(trip.id);
  };

  // Any filter change starts the list over at the best matches.
  function update(changes) {
    prefs = { ...prefs, ...changes };
    limit = PAGE;
    render();
  }

  function render() {
    const skills = getSkills();
    const { results, counts } = recommend(trips, prefs, skills);

    document.querySelectorAll('.chip[data-pref]').forEach(chip => {
      chip.setAttribute('aria-pressed', String(prefs[chip.dataset.pref].includes(chip.dataset.value)));
    });
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
      tab.setAttribute('aria-pressed', String(prefs.tab === tab.dataset.tab));
      const count = tab.querySelector('.js-count');
      if (count) count.textContent = String(counts[tab.dataset.tab]);
    });
    if (document.activeElement !== search) search.value = prefs.q;
    region.value = prefs.region;
    month.value = String(prefs.month);
    surprise.checked = prefs.surprise;
    skillSelects.forEach(select => {
      select.value = skills[select.dataset.skill];
    });

    const visible = results.slice(0, limit).map(result => {
      const card = cardFor(result.trip);
      card.querySelector('.js-score').textContent = `${result.score}% match`;
      card.querySelector('.js-bar').style.width = `${result.score}%`;
      card.querySelector('.js-why').textContent = whyText(result, prefs);
      return card;
    });
    grid.replaceChildren(...visible);
    grid.removeAttribute('aria-busy');
    syncAll();

    empty.hidden = results.length > 0;
    summary.textContent = `${results.length} ${results.length === 1 ? 'combo' : 'combos'}, best match first`;
    const remaining = results.length - visible.length;
    more.hidden = remaining <= 0;
    more.textContent = `Show ${Math.min(PAGE, remaining)} more · ${remaining} left`;

    const params = new URLSearchParams({ get: prefs.get.join(','), do: prefs.do.join(',') });
    if (prefs.region !== 'any') params.set('region', prefs.region);
    if (prefs.month) params.set('month', String(prefs.month));
    if (prefs.q) params.set('q', prefs.q);
    history.replaceState(null, '', `?${params}`);
  }

  document.querySelector('.filters')?.addEventListener('click', event => {
    const chip = event.target instanceof Element ? event.target.closest('.chip[data-pref]') : null;
    if (!chip) return;
    const { pref, value } = chip.dataset;
    const current = prefs[pref];
    update({ [pref]: current.includes(value) ? current.filter(v => v !== value) : [...current, value] });
  });
  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => update({ tab: tab.dataset.tab }));
  });
  search.addEventListener('input', () => update({ q: search.value.trim() }));
  region.addEventListener('change', () => update({ region: region.value }));
  month.addEventListener('change', () => update({ month: Number(month.value) }));
  surprise.addEventListener('change', () => update({ surprise: surprise.checked }));
  skillSelects.forEach(select => {
    select.addEventListener('change', () => setSkill(select.dataset.skill, select.value));
  });
  document.getElementById('reset')?.addEventListener('click', () => {
    update({ get: [], do: [], region: 'any', month: 0, q: '', surprise: true, tab: 'all' });
  });
  more.addEventListener('click', () => {
    limit += PAGE;
    render();
  });

  try {
    trips = await loadTrips();
  } catch {
    summary.textContent = "Couldn't load the trips; try reloading the page.";
    return;
  }
  window.addEventListener('waypoints:change', render);
  window.addEventListener('storage', render);
  render();
}
