import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRIPS, REGIONS } from '../src/data/trips.js';
import { COORDS } from '../src/data/coords.js';
import { EVENTS } from '../src/data/events.js';
import { parseSeason, tripMonths, monthsText, monthRange } from '../src/lib/season.js';
import { upcoming, editionText, datesIn, ruleFor, formatRange, estimatedEvents } from '../src/lib/events.js';
import { recommend, matchesQuery } from '../src/lib/recommend.js';
import { compactTrips } from '../src/lib/compact.js';
import { photoFile, localize } from '../src/lib/local-photo.js';
import { DEFAULT_SKILLS } from '../src/data/skills.js';

const trip = id => TRIPS.find(t => t.id === id);

test('season text becomes months, including ranges past December and season words', () => {
  assert.deepEqual(parseSeason('April–June'), [4, 5, 6]);
  assert.deepEqual(parseSeason('October–May'), [1, 2, 3, 4, 5, 10, 11, 12]);
  assert.deepEqual(parseSeason('Mar–May and Oct–Nov'), [3, 4, 5, 10, 11]);
  assert.deepEqual(parseSeason('Mid-March to mid-June only'), [3, 4, 5, 6]);
  assert.deepEqual(parseSeason('June 1 – September 15'), [6, 7, 8, 9]);
  assert.deepEqual(parseSeason('Year-round; drier December–May'), monthRange(1, 12));
  assert.deepEqual(parseSeason('Spring and fall'), [3, 4, 5, 9, 10, 11]);
  assert.deepEqual(parseSeason('Late spring to autumn'), [5, 6, 7, 8, 9, 10, 11]);
  assert.deepEqual(parseSeason('Summer', true), [1, 2, 12]); // southern summer
  assert.equal(monthsText([1, 2, 3, 10, 11, 12]), 'Oct–Mar');
  assert.equal(monthsText(monthRange(1, 12)), 'Year-round');
});

test('every trip is good in at least one month', () => {
  for (const t of TRIPS) {
    const months = tripMonths(t, COORDS[t.id]?.[0]);
    assert.ok(months.length > 0, `${t.id}: no months from "${t.season}"`);
    assert.ok(months.every(m => Number.isInteger(m) && m >= 1 && m <= 12), `${t.id}: bad month`);
  }
});

test('trip coordinates are real and sit in the right part of the world', () => {
  const box = {
    'us-west': [30, 50, -125, -110], 'us-mountain': [29, 50, -120, -102], 'us-central': [24, 50, -106, -80],
    'us-southeast': [24, 38, -92, -75], 'us-northeast': [36, 48, -82, -66], 'us-alaska': [51, 72, -180, -129],
    'us-hawaii': [18, 23, -161, -154], canada: [41, 84, -142, -52], caribbean: [9, 28, -86, -59],
    // Europe takes in Greenland; Oceania runs past the date line to French Polynesia.
    latam: [-80, 33, -120, -30], europe: [27, 84, -75, 45], africa: [-36, 43, -20, 60],
    asia: [-12, 60, 40, 150], oceania: [-50, 20, 110, 180], polynesia: [-30, 0, -180, -130],
  };
  const inBox = (b, lat, lon) => b && lat >= b[0] && lat <= b[1] && lon >= b[2] && lon <= b[3];
  for (const t of TRIPS) {
    const c = COORDS[t.id];
    if (t.region === 'any' && !c) continue;
    assert.ok(Array.isArray(c) && c.length === 2, `${t.id}: needs coordinates`);
    const [lat, lon] = c;
    assert.ok(Math.abs(lat) <= 90 && Math.abs(lon) <= 180, `${t.id}: out of range`);
    if (!box[t.region]) continue;
    const ok = inBox(box[t.region], lat, lon) || (t.region === 'oceania' && inBox(box.polynesia, lat, lon));
    assert.ok(ok, `${t.id}: [${c}] is outside ${t.region}`);
  }
  for (const id of Object.keys(COORDS)) assert.ok(trip(id), `coordinates for unknown trip ${id}`);
});

test('event dates are valid, and each yearly rule matches its confirmed dates', () => {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  for (const [id, list] of Object.entries(EVENTS)) {
    assert.ok(trip(id), `events for unknown trip ${id}`);
    for (const e of list) {
      assert.ok(e.name && e.dates.length, `${id}: an event needs a name and dates`);
      for (const [start, end] of e.dates) {
        assert.ok(iso.test(start) && iso.test(end) && start <= end, `${id}: bad dates ${start} ${end}`);
        if (e.repeats) assert.deepEqual(datesIn(e.repeats, Number(start.slice(0, 4))), [start, end], `${id}: rule misses ${start}`);
      }
    }
  }
  assert.equal(formatRange('2026-09-21', '2026-09-27'), 'Sep 21–27, 2026');
  assert.equal(formatRange('2026-12-21', '2027-03-10'), 'Dec 21, 2026 – Mar 10, 2027');
});

test('trips with events list confirmed dates, then estimates, years ahead', () => {
  const nov = new Date('2026-11-02T12:00:00Z');
  const [fly] = upcoming('tripletree', nov);
  assert.deepEqual(fly.editions.map(editionText), ['Sep 20–26, 2027', 'About Sep 18–24, 2028', 'About Sep 24–30, 2029']);
  assert.equal(upcoming('supercon', nov)[0].editions[0].start, '2026-11-06');
  assert.ok(upcoming('lobstermini', nov)[0].editions.every(e => !e.estimated), 'set by state rule, so not estimates');
  assert.equal(upcoming('cccamp', nov)[0].editions.length, 2, 'every four years, no more than five years out');
  // Without a rule, estimates keep the weekday and week of the month: FOSDEM's last Saturday of January.
  assert.deepEqual(datesIn(ruleFor({ dates: [['2027-01-30', '2027-01-31']] }), 2028), ['2028-01-29', '2028-01-30']);
  // However much time passes, every event still shows an upcoming date.
  for (const id of Object.keys(EVENTS)) {
    for (const e of upcoming(id, new Date('2040-06-01T00:00:00Z'))) assert.ok(e.editions.length, `${id}: ${e.name} has no date in 2040`);
  }
  assert.ok(estimatedEvents(nov).some(e => e.id === 'teardown'));
});

test('trip text keeps year-specific dates in events.js, not in seasons', () => {
  for (const t of TRIPS) assert.doesNotMatch(t.season, /\b20\d\d\b/, `${t.id}: put dated events in events.js`);
});

test('search finds trips by place, name and activity', () => {
  assert.ok(matchesQuery(trip('shiohigari'), 'japan clams'));
  assert.ok(matchesQuery(trip('ninghai'), '赶海'));
  assert.ok(!matchesQuery(trip('johnson'), 'lobster'));
  const slim = compactTrips();
  const { results } = recommend(slim, { get: [], do: [], region: 'any', month: 4, q: 'japan', surprise: false, tab: 'all' }, DEFAULT_SKILLS);
  assert.ok(results.some(r => r.trip.id === 'shiohigari'), 'shiohigari is good in April');
  assert.ok(results.every(r => r.trip.months.includes(4) && matchesQuery(r.trip, 'japan')));
});

test('the slim trip list has every trip and only what pages need', () => {
  const slim = compactTrips();
  assert.equal(slim.length, TRIPS.length);
  for (const t of slim) {
    assert.ok(t.id && t.title && t.place && t.get.length && t.do.length && t.months.length, t.id);
    assert.ok(REGIONS.some(r => r.id === t.region), t.id);
    assert.equal(t.sources, undefined);
    assert.equal(t.summary, undefined);
  }
  assert.ok(JSON.stringify(slim).length < 400_000, 'trips.json should stay small');
});

test('photos fall back to Wikimedia until the server has downloaded them', () => {
  const remote = { src: 'https://upload.wikimedia.org/x/1280px-a.jpg', srcset: 'https://upload.wikimedia.org/x/500px-a.jpg 500w', alt: 'a' };
  assert.deepEqual(localize(remote), remote);
  assert.match(photoFile(remote.src), /^[0-9a-f]{16}\.jpg$/);
});
