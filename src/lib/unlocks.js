// What each next skill level opens up: for every level above yours on a track, the trips that
// become doable on your own, or with an instructor or guide, once you reach it. Shown under the
// skill tracks on the logbook (in full) and the home page (one line).
import { TRACKS } from '../data/skills.js';
import { readiness } from './recommend.js';
import { loadTrips } from './trip-data.js';
import { getSkills } from './store.js';

const byTitle = (a, b) => (a.short ?? a.title).localeCompare(b.short ?? b.title);

/**
 * [{ level, ready, guided }] for each level above yours on `track`. Each level lists only what it
 * adds over the level before: `ready` trips you can now do yourself, `guided` trips that were
 * goals and now work with a guide.
 */
export function unlocksFor(track, trips, skills) {
  const here = track.levels.findIndex(l => l.id === skills[track.key]);
  const tracked = trips.filter(t => t.req?.skill === track.key);
  let before = skills;
  return track.levels.slice(here + 1).map(level => {
    const after = { ...skills, [track.key]: level.id };
    const ready = [];
    const guided = [];
    for (const trip of tracked) {
      const was = readiness(trip.req, before);
      const now = readiness(trip.req, after);
      if (now === 'ready' && was !== 'ready') ready.push(trip);
      else if (now === 'guided' && was === 'goal') guided.push(trip);
    }
    before = after;
    return { level, ready: ready.sort(byTitle), guided: guided.sort(byTitle) };
  });
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "12 trips on your own, 3 more with a guide", or null when a level adds nothing. */
export function unlockSummary({ ready, guided }) {
  if (ready.length && guided.length) return `${plural(ready.length, 'trip')} on your own, ${guided.length} more with a guide`;
  if (ready.length) return `${plural(ready.length, 'trip')} on your own`;
  if (guided.length) return `${plural(guided.length, 'trip')} with a guide`;
  return null;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function tripLinks(label, trips) {
  const group = el('div', 'unlock-group');
  group.append(el('span', 'unlock-label', label));
  const list = el('ul', 'unlock-list');
  for (const trip of trips) {
    const link = el('a', null, trip.short ?? trip.title);
    link.href = `/trips/${trip.id}/`;
    link.title = trip.title;
    const item = el('li');
    item.append(link);
    list.append(item);
  }
  group.append(list);
  return group;
}

// Logbook: every level above yours, each one opening to the trips it adds.
function renderFull(box, steps) {
  if (!steps.length) {
    box.replaceChildren(el('p', 'unlock-none', "You're at the top of this track: every trip that needs it is open to you."));
    return;
  }
  box.replaceChildren(...steps.map(step => {
    const summary = unlockSummary(step);
    if (!summary) return el('p', 'unlock-none', `${step.level.label}: a step on the way, no new trips yet`);
    const details = el('details', 'unlock');
    const head = el('summary');
    head.append(el('strong', null, step.level.label), document.createTextNode(` opens ${summary}`));
    details.append(head);
    if (step.ready.length) details.append(tripLinks('On your own', step.ready));
    if (step.guided.length) details.append(tripLinks('With a guide', step.guided));
    return details;
  }));
}

// Home page: the first level up that opens anything.
function renderShort(box, steps, track) {
  const step = steps.find(s => unlockSummary(s));
  box.replaceChildren();
  if (!step) return;
  const link = el('a', 'lnk', `${step.level.label} opens ${unlockSummary(step)} →`);
  link.href = `/logbook/#track-${track.key}`;
  box.append(link);
}

export async function initUnlocks() {
  const boxes = [...document.querySelectorAll('[data-track-unlocks]')];
  if (!boxes.length) return;
  let trips;
  try {
    trips = await loadTrips();
  } catch {
    return;
  }
  const render = () => {
    const skills = getSkills();
    for (const box of boxes) {
      const track = TRACKS.find(t => t.key === box.dataset.trackUnlocks);
      if (!track) continue;
      const steps = unlocksFor(track, trips, skills);
      if (box.dataset.unlockView === 'short') renderShort(box, steps, track);
      else renderFull(box, steps);
      box.hidden = box.childElementCount === 0;
    }
  };
  window.addEventListener('waypoints:change', render);
  window.addEventListener('storage', render);
  render();
}
