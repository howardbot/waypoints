// Per-browser state: your skill levels, saved trips, trips you've done or planned, and saved videos.
// Falls back to memory when localStorage is unavailable (private mode, blocked storage).
import { TRACKS, DEFAULT_SKILLS } from '../data/skills.js';

const KEY = 'waypoints:v1';
let memory = {};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : memory;
    return data && typeof data === 'object' ? data : {};
  } catch {
    return memory;
  }
}

function update(change) {
  const data = read();
  change(data);
  memory = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // memory copy still works for this page view
  }
  window.dispatchEvent(new CustomEvent('waypoints:change'));
}

const strings = value => (Array.isArray(value) ? value.filter(v => typeof v === 'string') : []);

export function getSkills() {
  const stored = read().skills || {};
  const skills = { ...DEFAULT_SKILLS };
  for (const track of TRACKS) {
    if (track.levels.some(l => l.id === stored[track.key])) skills[track.key] = stored[track.key];
  }
  return skills;
}

export function setSkill(key, level) {
  update(data => {
    data.skills = { ...(data.skills || {}), [key]: level };
  });
}

export function getSaved() {
  return strings(read().saved);
}

export function toggleSaved(id) {
  update(data => {
    const saved = strings(data.saved);
    data.saved = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id];
  });
}

const doneMap = value => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

/** Trips you've done: { [tripId]: { date: 'YYYY-MM-DD', note } }. */
export function getDone() {
  return doneMap(read().done);
}

export function setDone(id, { date = '', note = '' } = {}) {
  update(data => {
    data.done = { ...doneMap(data.done), [id]: { date: String(date), note: String(note) } };
  });
}

export function clearDone(id) {
  update(data => {
    const done = { ...doneMap(data.done) };
    delete done[id];
    data.done = done;
  });
}

const isMonth = entry => Number.isInteger(entry?.year) && Number.isInteger(entry?.month) && entry.month >= 1 && entry.month <= 12;

/** Trips you plan to do: { [tripId]: { year, month } }. */
export function getPlan() {
  return Object.fromEntries(Object.entries(doneMap(read().plan)).filter(([, entry]) => isMonth(entry)));
}

export function setPlan(id, { year, month }) {
  update(data => {
    data.plan = { ...doneMap(data.plan), [id]: { year: Number(year), month: Number(month) } };
  });
}

/** Add several plans at once (the planner's suggestions). */
export function addPlans(entries) {
  update(data => {
    data.plan = { ...doneMap(data.plan), ...entries };
  });
}

export function clearPlan(id) {
  update(data => {
    const plan = { ...doneMap(data.plan) };
    delete plan[id];
    data.plan = plan;
  });
}

export function getVideos(tripId) {
  return strings((read().videos || {})[tripId]);
}

export function addVideo(tripId, url) {
  update(data => {
    data.videos = { ...(data.videos || {}), [tripId]: [...strings((data.videos || {})[tripId]), url] };
  });
}

export function removeVideo(tripId, index) {
  update(data => {
    data.videos = { ...(data.videos || {}), [tripId]: strings((data.videos || {})[tripId]).filter((_, i) => i !== index) };
  });
}
