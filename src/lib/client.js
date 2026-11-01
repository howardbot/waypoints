// Runs on every page: re-renders readiness badges, notes, skill tracks and
// save buttons from what this browser has stored. Pages are built with the
// default skills, so this brings them up to date with yours.
import { TRACKS } from '../data/skills.js';
import { getSkills, getSaved, toggleSaved } from './store.js';
import { readiness, stepStatus, STATE_LABEL } from './recommend.js';

const parse = json => {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
};

function syncBadges(skills) {
  document.querySelectorAll('.badge[data-req]').forEach(el => {
    const state = stepStatus({ req: parse(el.dataset.req), guided: el.dataset.guided === 'true' }, skills);
    el.dataset.state = state;
    const label = el.querySelector('.badge-label');
    if (label) label.textContent = state === 'goal' ? el.dataset.goalLabel || STATE_LABEL.goal : STATE_LABEL[state];
  });
}

function syncNotes(skills) {
  document.querySelectorAll('.js-note[data-notes]').forEach(el => {
    const notes = parse(el.dataset.notes) || {};
    el.textContent = notes[readiness(parse(el.dataset.req), skills)] ?? notes.ready ?? '';
  });
}

function syncTracks(skills) {
  document.querySelectorAll('[data-track]').forEach(el => {
    const track = TRACKS.find(t => t.key === el.dataset.track);
    if (!track) return;
    const level = skills[track.key];
    const idx = track.levels.findIndex(l => l.id === level);
    el.querySelectorAll('.step[data-level]').forEach((step, i) => {
      step.dataset.pos = i < idx ? 'done' : i === idx ? 'now' : 'todo';
      if (i === idx) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
      if (step.tagName === 'BUTTON') step.setAttribute('aria-pressed', String(i === idx));
    });
    const levelEl = el.querySelector('[data-track-level]');
    if (levelEl) levelEl.textContent = track.levels[idx]?.label ?? '';
    const unlockEl = el.querySelector('[data-track-unlock]');
    if (unlockEl) unlockEl.textContent = track.unlock[level] ?? '';
  });
}

function syncSaved() {
  const saved = getSaved();
  document.querySelectorAll('[data-save]').forEach(button => {
    const on = saved.includes(button.dataset.save);
    button.setAttribute('aria-pressed', String(on));
    const label = button.querySelector('.js-save-label');
    if (label) label.textContent = on ? button.dataset.savedText : button.dataset.saveText;
  });
  document.querySelectorAll('[data-saved-count]').forEach(el => {
    el.textContent = String(saved.length);
  });
}

export function syncAll() {
  const skills = getSkills();
  syncBadges(skills);
  syncNotes(skills);
  syncTracks(skills);
  syncSaved();
}

export function initShared() {
  document.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('[data-save]') : null;
    if (button) toggleSaved(button.dataset.save);
  });
  window.addEventListener('waypoints:change', syncAll);
  window.addEventListener('storage', syncAll);
  syncAll();
}
