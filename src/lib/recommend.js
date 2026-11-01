import { TRACKS } from '../data/skills.js';

export const STATE_LABEL = { ready: 'Ready now', guided: 'With a guide', goal: 'Goal trip' };
const STATE_BONUS = { ready: 20, guided: 14, goal: 6 };

export function levelIndex(skill, level) {
  const track = TRACKS.find(t => t.key === skill);
  return track ? track.levels.findIndex(l => l.id === level) : -1;
}

export function levelLabel(skill, level) {
  const track = TRACKS.find(t => t.key === skill);
  return track?.levels.find(l => l.id === level)?.label ?? level;
}

/** How ready you are for `req` ({ skill, readyAt, guideAt? }): 'ready' | 'guided' | 'goal'. */
export function readiness(req, skills) {
  if (!req || req.readyAt === 'none') return 'ready';
  const have = levelIndex(req.skill, skills[req.skill]);
  if (have >= levelIndex(req.skill, req.readyAt)) return 'ready';
  if (req.guideAt && req.guideAt !== req.readyAt && have >= levelIndex(req.skill, req.guideAt)) return 'guided';
  return 'goal';
}

/** Like readiness(), but a step marked `guided` never counts as doing it alone. */
export function stepStatus({ req, guided }, skills) {
  const state = readiness(req, skills);
  return state === 'ready' && guided ? 'guided' : state;
}

export function inRegion(trip, region) {
  return !region || region === 'any' || trip.region === 'any' || trip.region === region;
}

/**
 * Score one trip against what you picked (prefs.get, prefs.do) and your skills.
 * Up to 35 for a matching way there, 40 for the activities, 20 for readiness,
 * and 12 extra for new-to-you trips when prefs.surprise is on.
 */
export function scoreTrip(trip, prefs, skills) {
  const state = readiness(trip.req, skills);
  const getHits = trip.get.filter(m => prefs.get.includes(m));
  const doHits = trip.do.filter(a => prefs.do.includes(a));
  let score = prefs.get.length ? (getHits.length ? 35 : 0) : 20;
  score += prefs.do.length ? Math.round((40 * doHits.length) / prefs.do.length) : 25;
  score += STATE_BONUS[state];
  if (prefs.surprise && trip.isNew) score += 12;
  return { state, score: Math.max(5, Math.min(99, score)), hits: [...getHits, ...doHits] };
}

/** Rank trips for the Discover page. Counts cover the region before the readiness tab is applied. */
export function recommend(trips, prefs, skills) {
  const scored = trips
    .filter(t => inRegion(t, prefs.region))
    .map(trip => ({ trip, ...scoreTrip(trip, prefs, skills) }));
  const counts = { all: scored.length, ready: 0, guided: 0, goal: 0 };
  for (const s of scored) counts[s.state] += 1;
  const results = scored
    .filter(s => !prefs.tab || prefs.tab === 'all' || s.state === prefs.tab)
    .sort((a, b) => b.score - a.score || a.trip.title.localeCompare(b.trip.title));
  return { results, counts };
}
