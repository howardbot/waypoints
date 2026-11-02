// Planner page: your plan by year and month, saved trips not planned yet, and every dated event
// in the next five years, with suggested months and a calendar download (.ics).
import { getPlan, setPlan, clearPlan, addPlans, getSaved } from './store.js';
import { loadTrips } from './trip-data.js';
import { MONTH_NAMES, monthsText } from './season.js';
import { editionText } from './events.js';
import { calendar } from './ics.js';
import { PLAN_YEARS, thisMonth, monthLabel, suggestMonth, suggestPlan, planNotes, planEvents } from './plan.js';

const SHORT = MONTH_NAMES.map(m => m.slice(0, 3));
const key = ({ year, month }) => year * 12 + month;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function tripLink(trip, text = trip.title) {
  const link = el('a', 'plan-title', text);
  link.href = `/trips/${trip.id}/`;
  return link;
}

function notesList(notes) {
  const box = el('span', 'plan-notes');
  for (const note of notes) {
    const line = el('span', null, note.text);
    line.dataset.kind = note.kind;
    box.append(line);
  }
  return box;
}

function select(options, value, label, focusKey) {
  const node = el('select', 'select select-sm');
  node.setAttribute('aria-label', label);
  node.dataset.focus = focusKey;
  node.append(...options.map(([v, text]) => new Option(text, String(v))));
  node.value = String(value);
  return node;
}

function plannedRow(trip, entry, plan, byId, years) {
  const row = el('div', 'row plan-row');
  const main = el('div', 'plan-main');
  main.append(tripLink(trip), el('span', 'row-meta', trip.place), notesList(planNotes(trip, entry, plan, byId)));
  const month = select(SHORT.map((m, i) => [i + 1, m]), entry.month, `Month for ${trip.title}`, `${trip.id}-month`);
  const yearOptions = [...new Set([...years, entry.year])].sort().map(y => [y, String(y)]);
  const year = select(yearOptions, entry.year, `Year for ${trip.title}`, `${trip.id}-year`);
  const move = () => setPlan(trip.id, { year: Number(year.value), month: Number(month.value) });
  month.addEventListener('change', move);
  year.addEventListener('change', move);
  const remove = el('button', 'lnk', 'Remove');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Remove ${trip.title} from the plan`);
  remove.addEventListener('click', () => clearPlan(trip.id));
  const edit = el('div', 'plan-edit');
  edit.append(month, year, remove);
  row.append(el('span', 'plan-when', SHORT[entry.month - 1].toUpperCase()), main, edit);
  return row;
}

function yearBlock(year, entries, plan, byId, years, now) {
  const block = el('section', 'plan-year');
  block.setAttribute('aria-label', String(year));
  const head = el('div', 'plan-year-head');
  head.append(el('h2', 'display h3', String(year)), el('span', 'row-state', entries.length ? `${entries.length} PLANNED` : 'OPEN'));
  const strip = el('ol', 'month-strip');
  strip.setAttribute('aria-label', `Trips by month in ${year}`);
  for (let month = 1; month <= 12; month++) {
    const count = entries.filter(([, e]) => e.month === month).length;
    const cell = el('li');
    cell.dataset.count = String(Math.min(count, 2));
    if (year < now.year || (year === now.year && month < now.month)) cell.dataset.past = 'true';
    cell.setAttribute('aria-label', `${MONTH_NAMES[month - 1]}: ${count ? `${count} planned` : 'free'}`);
    cell.append(el('span', null, SHORT[month - 1]), el('span', 'month-strip-count', count ? String(count) : '·'));
    strip.append(cell);
  }
  block.append(head, strip);
  if (entries.length) {
    const rows = el('div', 'rows');
    rows.append(...entries.map(([id, entry]) => plannedRow(byId.get(id), entry, plan, byId, years)));
    block.append(rows);
  } else {
    block.append(el('p', 'empty-row', `Nothing planned in ${year} yet.`));
  }
  return block;
}

function unplannedRow(trip, plan, now, byId) {
  const row = el('div', 'row plan-row');
  const main = el('div', 'plan-main');
  const event = trip.events?.[0];
  const meta = event?.editions[0] ? `${event.name}: ${editionText(event.editions[0])}` : `Best months: ${monthsText(trip.months)}`;
  main.append(tripLink(trip), el('span', 'row-meta', meta));
  const suggestion = suggestMonth(trip, plan, now, byId);
  const add = el('button', 'btn btn-outline btn-sm', `Plan for ${monthLabel(suggestion)}`);
  add.type = 'button';
  add.addEventListener('click', () => setPlan(trip.id, suggestion));
  row.append(main, add);
  return row;
}

function eventRows(trips, plan, year) {
  const editions = trips
    .flatMap(trip => (trip.events ?? []).flatMap(e => e.editions.map(ed => ({ trip, name: e.name, ed }))))
    .filter(({ ed }) => ed.start.startsWith(String(year)))
    .sort((a, b) => a.ed.start.localeCompare(b.ed.start));
  return editions.map(({ trip, name, ed }) => {
    const month = { year, month: Number(ed.start.slice(5, 7)) };
    const row = el('div', 'row plan-row');
    const main = el('div', 'plan-main');
    main.append(tripLink(trip, name), el('span', 'row-meta', `${editionText(ed)} · ${trip.title}`));
    const entry = plan[trip.id];
    let action;
    if (entry && key(entry) === key(month)) {
      action = el('span', 'row-state', 'PLANNED');
    } else {
      action = el('button', 'btn btn-outline btn-sm', entry ? `Move from ${monthLabel(entry)}` : 'Plan it');
      action.type = 'button';
      action.addEventListener('click', () => setPlan(trip.id, month));
    }
    row.append(el('span', 'plan-when', SHORT[month.month - 1].toUpperCase()), main, action);
    return row;
  });
}

function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
  const link = el('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function initPlanner() {
  const yearsBox = document.querySelector('.js-years');
  const unplannedBox = document.querySelector('.js-unplanned');
  const unplannedEmpty = document.querySelector('.js-unplanned-empty');
  const eventsBox = document.querySelector('.js-events');
  const eventTabs = document.querySelector('.js-event-years');
  const suggestButton = document.querySelector('.js-suggest');
  const suggestNote = document.querySelector('.js-suggest-note');
  const downloadButton = document.querySelector('.js-download');
  if (!yearsBox || !unplannedBox || !eventsBox) return;
  document.querySelector('.js-subscribe').href = `webcal://${location.host}/calendar.ics`;

  let trips;
  try {
    trips = await loadTrips();
  } catch {
    yearsBox.replaceChildren(el('p', 'empty-row', "Couldn't load the trips. Reload to try again."));
    return;
  }
  const byId = new Map(trips.map(t => [t.id, t]));
  const now = thisMonth();
  const years = Array.from({ length: PLAN_YEARS }, (_, i) => now.year + i);
  let eventYear = now.year;

  const currentPlan = () => Object.fromEntries(Object.entries(getPlan()).filter(([id]) => byId.has(id)));
  const unplannedTrips = plan => getSaved().map(id => byId.get(id)).filter(t => t && !plan[t.id]);

  const render = () => {
    const focus = document.activeElement?.dataset?.focus;
    const plan = currentPlan();
    const entries = Object.entries(plan).sort(
      ([a, x], [b, y]) => key(x) - key(y) || byId.get(a).title.localeCompare(byId.get(b).title),
    );
    const shownYears = [...new Set([...entries.map(([, e]) => e.year).filter(y => y < now.year), ...years])].sort();
    yearsBox.replaceChildren(...shownYears.map(y => yearBlock(y, entries.filter(([, e]) => e.year === y), plan, byId, years, now)));
    yearsBox.removeAttribute('aria-busy');

    const unplanned = unplannedTrips(plan);
    unplannedBox.replaceChildren(...unplanned.map(t => unplannedRow(t, plan, now, byId)));
    unplannedBox.hidden = unplanned.length === 0;
    unplannedEmpty.hidden = unplanned.length > 0;
    unplannedEmpty.textContent = getSaved().length
      ? 'Every saved trip has a month. Save more in Discover.'
      : 'Nothing saved yet. Tap Save on trips in Discover, then plan them here.';
    suggestButton.disabled = unplanned.length === 0;
    downloadButton.disabled = entries.length === 0;

    eventTabs.replaceChildren(...years.map(y => {
      const tab = el('button', 'tab', String(y));
      tab.type = 'button';
      tab.setAttribute('aria-pressed', String(y === eventYear));
      tab.addEventListener('click', () => {
        eventYear = y;
        render();
      });
      return tab;
    }));
    const rows = eventRows(trips, plan, eventYear);
    eventsBox.replaceChildren(...(rows.length ? rows : [el('p', 'empty-row', `No dated events left in ${eventYear}.`)]));

    if (focus) document.querySelector(`[data-focus="${focus}"]`)?.focus();
  };

  suggestButton.addEventListener('click', () => {
    const plan = currentPlan();
    const added = suggestPlan(unplannedTrips(plan), plan, now, byId);
    addPlans(added);
    const count = Object.keys(added).length;
    suggestNote.textContent = `Planned ${count} trip${count === 1 ? '' : 's'}: change any month below.`;
  });
  downloadButton.addEventListener('click', () => {
    download('waypoints-plan.ics', calendar({ name: 'Waypoints plan', events: planEvents(currentPlan(), byId, location.origin) }));
  });
  window.addEventListener('waypoints:change', render);
  window.addEventListener('storage', render);
  render();
}
