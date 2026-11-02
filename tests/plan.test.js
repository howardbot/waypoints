import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compactTrips } from '../src/lib/compact.js';
import { suggestMonth, suggestPlan, planNotes, planEvents, fittingMonths, monthsFrom } from '../src/lib/plan.js';
import { calendar } from '../src/lib/ics.js';
import { feedEvents } from '../src/lib/feed.js';

const today = new Date('2026-11-02T12:00:00Z');
const slim = compactTrips(today);
const byId = new Map(slim.map(t => [t.id, t]));
const trip = id => byId.get(id);
const dec2026 = { year: 2026, month: 12 };

test('months run across year ends', () => {
  assert.deepEqual(monthsFrom({ year: 2026, month: 11 }, 3), [{ year: 2026, month: 11 }, { year: 2026, month: 12 }, { year: 2027, month: 1 }]);
});

test('event trips are suggested for their event months, others for their best months', () => {
  assert.deepEqual(suggestMonth(trip('tripletree'), {}, dec2026, byId), { year: 2027, month: 9 });
  assert.deepEqual(suggestMonth(trip('fosdem'), {}, dec2026, byId), { year: 2027, month: 1 });
  const johnson = suggestMonth(trip('johnson'), {}, dec2026, byId);
  assert.ok(trip('johnson').months.includes(johnson.month));
  assert.ok(johnson.year * 12 + johnson.month > 2026 * 12 + 12, 'trips without dates start next month');
  // Two fly-ins on different weeks of September fit; a trip without dates needs the month.
  const fly = { tripletree: { year: 2027, month: 9 } };
  assert.deepEqual(suggestMonth(trip('moosehead'), fly, dec2026, byId), { year: 2027, month: 9 });
  const camping = { johnson: { year: 2027, month: 9 } };
  assert.deepEqual(suggestMonth(trip('moosehead'), camping, dec2026, byId), { year: 2028, month: 9 });
  assert.equal(fittingMonths(trip('cccamp'), dec2026).length, 2); // 2027 and 2031
});

test('suggested plans spread trips over free months, events first', () => {
  const wish = ['catalina', 'johnson', 'tripletree', 'moosehead', 'oshkosh', 'lofoten', 'bvi'].map(trip);
  const plan = suggestPlan(wish, { bvi: { year: 2027, month: 1 } }, dec2026, byId);
  assert.equal(plan.bvi, undefined, 'already planned trips stay put');
  assert.deepEqual(plan.tripletree, { year: 2027, month: 9 });
  assert.deepEqual(plan.oshkosh, { year: 2027, month: 7 });
  const all = { ...plan, bvi: { year: 2027, month: 1 } };
  for (const [id, entry] of Object.entries(plan)) {
    assert.deepEqual(planNotes(trip(id), entry, all, byId).filter(n => n.kind === 'busy' || n.kind === 'off'), [], `${id} fits its month`);
  }
});

test('plan notes flag shared months, missed events and off-season months', () => {
  const plan = { tripletree: { year: 2027, month: 9 }, moosehead: { year: 2027, month: 9 }, johnson: { year: 2027, month: 9 } };
  const notes = planNotes(trip('tripletree'), plan.tripletree, plan, byId);
  assert.deepEqual(notes.map(n => n.kind), ['event', 'busy', 'also']);
  assert.match(notes[0].text, /Sep 20–26, 2027/);
  assert.match(notes[1].text, /^Same month as /);
  assert.match(notes[2].text, /on other days: Moosehead/i);
  assert.match(planNotes(trip('tripletree'), { year: 2027, month: 6 }, {}, byId)[0].text, /^Triple Tree Fly-In is Sep 20–26, 2027/);
  assert.match(planNotes(trip('johnson'), { year: 2027, month: 1 }, {}, byId)[0].text, /^Outside its best months/);
});

test('calendar text is valid iCalendar: escaped, folded, all-day with an exclusive end', () => {
  const text = calendar({
    name: 'Test',
    stamp: today,
    events: [{ uid: 'a@x', start: '2027-09-20', end: '2027-09-26', summary: 'Fly-in; camp, fly', description: 'x'.repeat(200), url: 'https://example.test/trips/a/' }],
  });
  assert.ok(text.startsWith('BEGIN:VCALENDAR\r\n') && text.endsWith('END:VCALENDAR\r\n'));
  assert.match(text, /DTSTART;VALUE=DATE:20270920\r\nDTEND;VALUE=DATE:20270927\r\n/);
  assert.match(text, /SUMMARY:Fly-in\\; camp\\, fly/);
  assert.match(text, /DTSTAMP:20261102T120000Z/);
  for (const line of text.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, `too long: ${line}`);
  assert.match(text, /\r\n x/, 'long lines continue after a space');
});

test('the feed has every event, marks estimates and keeps stable UIDs', () => {
  const events = feedEvents(today, 'https://site.test/');
  assert.ok(events.some(e => e.summary === 'Triple Tree Fly-In' && e.start === '2027-09-20'));
  assert.ok(events.some(e => e.summary === 'Teardown (estimated)'));
  assert.equal(new Set(events.map(e => e.uid)).size, events.length);
  assert.ok(events.every(e => e.url.startsWith('https://site.test/trips/')));
  assert.ok(feedEvents(today).every(e => e.url === ''));
  // An estimate and its confirmed date share a UID, so calendars move the event.
  const later = feedEvents(new Date('2027-11-02T12:00:00Z'));
  const ttfi2028 = events.find(e => e.uid === 'tripletree-0-2028@waypoints');
  assert.ok(ttfi2028 && later.some(e => e.uid === ttfi2028.uid));
});

test('the plan download uses event dates when the event is in the planned month', () => {
  const plan = { tripletree: { year: 2027, month: 9 }, johnson: { year: 2027, month: 7 } };
  const events = planEvents(plan, byId, 'https://site.test');
  const fly = events.find(e => e.uid.startsWith('plan-tripletree'));
  assert.deepEqual([fly.start, fly.end], ['2027-09-20', '2027-09-26']);
  const camp = events.find(e => e.uid === 'plan-johnson@waypoints');
  assert.deepEqual([camp.start, camp.end], ['2027-07-01', '2027-07-01']);
  assert.equal(camp.url, 'https://site.test/trips/johnson/');
});
