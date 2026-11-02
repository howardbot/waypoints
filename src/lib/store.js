// Your state: skill levels, saved trips, trips you've done or planned, and saved videos. It lives
// in this browser and syncs with your other devices (sync.js); every change notes when each item
// changed, so merges keep the newest. Falls back to memory when localStorage is unavailable
// (private mode, blocked storage).
import { TRACKS, DEFAULT_SKILLS } from '../data/skills.js';
import { toFields, changedFields } from './sync-merge.js';

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

function write(data, detail) {
  memory = data;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // memory copy still works for this page view
  }
  if (detail !== false) window.dispatchEvent(new CustomEvent('waypoints:change', { detail }));
}

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const stampsOf = data => (isObject(data.stamps) ? data.stamps : {});

function update(change) {
  const data = read();
  const before = toFields(data);
  change(data);
  const stamps = { ...stampsOf(data) };
  const now = Date.now();
  for (const field of changedFields(before, toFields(data))) stamps[field] = now;
  data.stamps = stamps;
  write(data, { source: 'local' });
}

const strings = value => (Array.isArray(value) ? value.filter(v => typeof v === 'string') : []);

/** Everything in this browser as sync fields, with when each item last changed (see sync-merge.js). */
export function localFields() {
  const data = read();
  const values = toFields(data);
  const stamps = stampsOf(data);
  const fields = {};
  for (const [field, v] of Object.entries(values)) fields[field] = { v, t: stamps[field] ?? 1 }; // 1: saved before sync existed
  for (const [field, t] of Object.entries(stamps)) if (!(field in values)) fields[field] = { v: null, t };
  return fields;
}

function setField(data, field, v) {
  const [kind, id] = [field.slice(0, field.indexOf('.')), field.slice(field.indexOf('.') + 1)];
  if (kind === 'saved') {
    const saved = strings(data.saved);
    if (v && !saved.includes(id)) data.saved = [...saved, id];
    if (!v) data.saved = saved.filter(x => x !== id);
    return;
  }
  const map = { ...(isObject(data[kind]) ? data[kind] : {}) };
  if (v == null) delete map[id];
  else map[id] = v;
  data[kind] = map;
}

/** Take every synced field that's newer than this browser's copy. Returns whether anything changed. */
export function applyFields(remote) {
  const data = read();
  const before = toFields(data);
  const stamps = { ...stampsOf(data) };
  let newer = false;
  for (const [field, { v, t }] of Object.entries(remote)) {
    if (t <= (stamps[field] ?? (field in before ? 1 : 0))) continue;
    stamps[field] = t;
    setField(data, field, v);
    newer = true;
  }
  if (!newer) return false;
  data.stamps = stamps;
  const changed = changedFields(before, toFields(data)).length > 0;
  write(data, changed ? { source: 'sync' } : false);
  return changed;
}

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
