import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, DEFAULT_SKILLS } from '../src/data/skills.js';
import { compactTrips } from '../src/lib/compact.js';
import { readiness } from '../src/lib/recommend.js';
import { unlocksFor, unlockSummary } from '../src/lib/unlocks.js';

const trips = compactTrips();
const track = key => TRACKS.find(t => t.key === key);

test('each level lists only the trips it adds, and they really change state there', () => {
  for (const t of TRACKS) {
    const steps = unlocksFor(t, trips, DEFAULT_SKILLS);
    const here = t.levels.findIndex(l => l.id === DEFAULT_SKILLS[t.key]);
    assert.deepEqual(steps.map(s => s.level.id), t.levels.slice(here + 1).map(l => l.id));
    const seen = new Set();
    for (const [i, step] of steps.entries()) {
      const before = i === 0 ? DEFAULT_SKILLS : { ...DEFAULT_SKILLS, [t.key]: steps[i - 1].level.id };
      const after = { ...DEFAULT_SKILLS, [t.key]: step.level.id };
      for (const trip of step.ready) {
        assert.equal(readiness(trip.req, after), 'ready');
        assert.notEqual(readiness(trip.req, before), 'ready');
        assert.ok(!seen.has(trip.id), `${trip.id} listed twice`);
        seen.add(trip.id);
      }
      for (const trip of step.guided) assert.deepEqual([readiness(trip.req, before), readiness(trip.req, after)], ['goal', 'guided']);
    }
  }
});

test('a private pilot certificate opens the fly-in trips; the top level opens nothing more', () => {
  const ppl = unlocksFor(track('fly'), trips, DEFAULT_SKILLS).find(s => s.level.id === 'ppl');
  assert.ok(ppl.ready.some(t => t.id === 'johnson'));
  assert.ok(ppl.ready.length >= 10);
  assert.deepEqual(unlocksFor(track('fly'), trips, { ...DEFAULT_SKILLS, fly: 'ppl' }), []);
});

test('unlock summaries read naturally', () => {
  const t = { id: 'x', title: 'X' };
  assert.equal(unlockSummary({ ready: [t, t], guided: [t] }), '2 trips on your own, 1 more with a guide');
  assert.equal(unlockSummary({ ready: [t], guided: [] }), '1 trip on your own');
  assert.equal(unlockSummary({ ready: [], guided: [t, t] }), '2 trips with a guide');
  assert.equal(unlockSummary({ ready: [], guided: [] }), null);
});
