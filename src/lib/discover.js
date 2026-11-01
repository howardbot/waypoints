// Discover page: every trip card is already in the HTML; this script scores
// them, hides the ones filtered out and puts the rest in ranked order.
import { TRIPS, LABEL, MODES, ACTIVITIES, REGIONS } from '../data/trips.js';
import { recommend } from './recommend.js';
import { getSkills, setSkill } from './store.js';

function readPrefs() {
  const params = new URLSearchParams(location.search);
  const list = (key, allowed) => (params.get(key) || '').split(',').filter(v => allowed.includes(v));
  const fromLink = params.has('get') || params.has('do');
  const region = params.get('region');
  return {
    get: fromLink ? list('get', MODES) : ['fly'],
    do: fromLink ? list('do', ACTIVITIES) : ['camp'],
    region: REGIONS.some(r => r.id === region) ? region : 'any',
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

export function initDiscover() {
  const grid = document.getElementById('results');
  if (!grid) return;
  const cards = new Map([...grid.querySelectorAll('[data-trip-id]')].map(el => [el.dataset.tripId, el]));
  const empty = document.getElementById('empty');
  const summary = document.getElementById('summary');
  const region = document.getElementById('region');
  const surprise = document.getElementById('surprise');
  const skillSelects = [...document.querySelectorAll('select[data-skill]')];
  const more = document.getElementById('more');
  const PAGE = 18;
  let prefs = readPrefs();
  let limit = PAGE;

  // Any filter change starts the list over at the best matches.
  function update(changes) {
    prefs = { ...prefs, ...changes };
    limit = PAGE;
    render();
  }

  function render() {
    const skills = getSkills();
    const { results, counts } = recommend(TRIPS, prefs, skills);

    document.querySelectorAll('.chip[data-pref]').forEach(chip => {
      chip.setAttribute('aria-pressed', String(prefs[chip.dataset.pref].includes(chip.dataset.value)));
    });
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
      tab.setAttribute('aria-pressed', String(prefs.tab === tab.dataset.tab));
      const count = tab.querySelector('.js-count');
      if (count) count.textContent = String(counts[tab.dataset.tab]);
    });
    region.value = prefs.region;
    surprise.checked = prefs.surprise;
    skillSelects.forEach(select => {
      select.value = skills[select.dataset.skill];
    });

    const visible = results.slice(0, limit);
    const shown = new Set(visible.map(r => r.trip.id));
    cards.forEach((card, id) => {
      card.hidden = !shown.has(id);
    });
    for (const result of visible) {
      const card = cards.get(result.trip.id);
      card.querySelector('.js-score').textContent = `${result.score}% match`;
      card.querySelector('.js-bar').style.width = `${result.score}%`;
      card.querySelector('.js-why').textContent = whyText(result, prefs);
      grid.appendChild(card);
    }
    empty.hidden = results.length > 0;
    summary.textContent = `${results.length} ${results.length === 1 ? 'combo' : 'combos'}, best match first`;
    const remaining = results.length - visible.length;
    more.hidden = remaining <= 0;
    more.textContent = `Show ${Math.min(PAGE, remaining)} more · ${remaining} left`;

    const params = new URLSearchParams({ get: prefs.get.join(','), do: prefs.do.join(',') });
    if (prefs.region !== 'any') params.set('region', prefs.region);
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
  region.addEventListener('change', () => update({ region: region.value }));
  surprise.addEventListener('change', () => update({ surprise: surprise.checked }));
  skillSelects.forEach(select => {
    select.addEventListener('change', () => setSkill(select.dataset.skill, select.value));
  });
  document.getElementById('reset')?.addEventListener('click', () => {
    update({ get: [], do: [], region: 'any', surprise: true, tab: 'all' });
  });
  more.addEventListener('click', () => {
    limit += PAGE;
    render();
  });
  window.addEventListener('waypoints:change', render);
  window.addEventListener('storage', render);
  render();
}
