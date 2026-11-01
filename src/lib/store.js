// Per-browser state: your skill levels, saved trips and saved videos.
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
