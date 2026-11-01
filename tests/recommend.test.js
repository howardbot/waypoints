import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readiness, stepStatus, recommend, levelIndex } from '../src/lib/recommend.js';
import { TRIPS, MODES, ACTIVITIES, REGIONS } from '../src/data/trips.js';
import { TRACKS, DEFAULT_SKILLS } from '../src/data/skills.js';

const trip = id => TRIPS.find(t => t.id === id);
const prefs = (over = {}) => ({ get: [], do: [], region: 'any', surprise: false, tab: 'all', ...over });

test('Catalina: goal before lessons, with an instructor as a student, ready as a private pilot', () => {
  const { req } = trip('catalina');
  assert.equal(readiness(req, { ...DEFAULT_SKILLS, fly: 'none' }), 'goal');
  assert.equal(readiness(req, { ...DEFAULT_SKILLS, fly: 'student' }), 'guided');
  assert.equal(readiness(req, { ...DEFAULT_SKILLS, fly: 'ppl' }), 'ready');
});

test('Johnson Creek stays a goal until the PPL (no guided stage)', () => {
  const { req } = trip('johnson');
  assert.equal(readiness(req, { ...DEFAULT_SKILLS, fly: 'solo' }), 'goal');
  assert.equal(readiness(req, { ...DEFAULT_SKILLS, fly: 'ppl' }), 'ready');
});

test('a guideAt of none means you can always go with a skipper', () => {
  assert.equal(readiness(trip('sucia').req, { ...DEFAULT_SKILLS, sail: 'none' }), 'guided');
});

test('trips without a requirement are always ready', () => {
  assert.equal(readiness(null, DEFAULT_SKILLS), 'ready');
  assert.equal(readiness(trip('tortugas').req, { fly: 'none', dive: 'none', sail: 'none', freedive: 'none' }), 'ready');
});

test('guided steps never show as doing it alone', () => {
  assert.equal(stepStatus({ req: null, guided: true }, DEFAULT_SKILLS), 'guided');
  assert.equal(stepStatus({ req: { skill: 'fly', readyAt: 'ppl' }, guided: true }, DEFAULT_SKILLS), 'goal');
});

test('picked ways and activities rank first', () => {
  const { results } = recommend(TRIPS, prefs({ get: ['fly'], do: ['camp'] }), DEFAULT_SKILLS);
  const top = results[0].trip;
  assert.ok(top.get.includes('fly') && top.do.includes('camp'), `top result ${top.id} should be fly + camp`);
  for (let i = 1; i < results.length; i++) assert.ok(results[i - 1].score >= results[i].score);
});

test('region filter keeps nationwide trips and drops other regions', () => {
  const { results } = recommend(TRIPS, prefs({ region: 'west' }), DEFAULT_SKILLS);
  assert.ok(results.length > 0);
  for (const r of results) assert.ok(['west', 'any'].includes(r.trip.region), r.trip.id);
});

test('readiness tab filters results and the counts add up', () => {
  const all = recommend(TRIPS, prefs(), DEFAULT_SKILLS);
  assert.equal(all.counts.ready + all.counts.guided + all.counts.goal, all.counts.all);
  const goal = recommend(TRIPS, prefs({ tab: 'goal' }), DEFAULT_SKILLS);
  assert.equal(goal.results.length, all.counts.goal);
  assert.ok(goal.results.every(r => r.state === 'goal'));
});

test('surprise boosts new-to-you trips', () => {
  const base = recommend(TRIPS, prefs(), DEFAULT_SKILLS).results.find(r => r.trip.id === 'boundary');
  const boosted = recommend(TRIPS, prefs({ surprise: true }), DEFAULT_SKILLS).results.find(r => r.trip.id === 'boundary');
  assert.ok(boosted.score > base.score);
});

test('trip data is consistent', () => {
  const ids = new Set();
  const checkReq = (req, where) => {
    if (!req) return;
    assert.ok(TRACKS.some(t => t.key === req.skill), `${where}: unknown skill ${req.skill}`);
    for (const lvl of [req.readyAt, req.guideAt].filter(Boolean)) {
      assert.ok(levelIndex(req.skill, lvl) >= 0, `${where}: unknown level ${req.skill}.${lvl}`);
    }
  };
  for (const t of TRIPS) {
    assert.ok(!ids.has(t.id), `duplicate id ${t.id}`);
    ids.add(t.id);
    assert.ok(t.get.length && t.get.every(m => MODES.includes(m)), `${t.id}: bad get`);
    assert.ok(t.do.length && t.do.every(a => ACTIVITIES.includes(a)), `${t.id}: bad do`);
    assert.ok(REGIONS.some(r => r.id === t.region), `${t.id}: bad region`);
    assert.ok(t.notes?.ready, `${t.id}: needs notes.ready`);
    checkReq(t.req, t.id);
    (t.ways ?? []).forEach((w, i) => checkReq(w.req, `${t.id}.ways[${i}]`));
    (t.path ?? []).forEach((s, i) => checkReq(s.req, `${t.id}.path[${i}]`));
  }
});

test('every track has an unlock line for each level, and defaults are valid', () => {
  for (const track of TRACKS) {
    for (const level of track.levels) assert.ok(track.unlock[level.id], `${track.key}.${level.id}`);
    assert.ok(levelIndex(track.key, DEFAULT_SKILLS[track.key]) >= 0, `default for ${track.key}`);
  }
});
