import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageText, findDateMentions, datesToWatch } from '../src/lib/date-watch.js';

// Each line is how a real organizer page writes its dates.
const announced = [
  ['September 9-12th, 2027 Join us for the 53nd annual International Seaplane Fly-in', 2027, ''],
  ["FOSDEM '27 30 & 31 January 2027 Brussels, Belgium", 2027, ''],
  ['Ski & sail Lyngen: 6 - 12. Apr 2027, 3 - 9. May 2027', 2027, ''],
  ['Connecting the embedded community: 16 – 18.3.2027 in Nuremberg. Save the date!', 2027, ''],
  ['Hackaday Supercon 2027, November 5 to 7, Pasadena, California', 2027, 'Supercon'],
  ['Countdown to AirVenture 2030 July 22 – July 28, 2030', 2030, 'AirVenture'],
];

test('announced dates are spotted in the ways organizers write them', () => {
  for (const [text, year, near] of announced) {
    const { dates } = findDateMentions(text, year, { near });
    assert.equal(dates.length > 0, true, text);
  }
});

test('years without dates, copyright lines and other words are not taken for dates', () => {
  const festival = findDateMentions('Since 2027 marks our 50th Wooden Boat Festival, we want your art.', 2027, { near: 'Festival' });
  assert.deepEqual(festival.dates, []);
  assert.equal(festival.mentions.length, 1, 'still noted as a mention');
  assert.deepEqual(findDateMentions('© 2027 Example Org, May 1 newsletter', 2027).dates, []);
  assert.deepEqual(findDateMentions('Maybe 12 people came in 2027', 2027).dates, []);
});

test('with `near`, only the part of the page about the event counts', () => {
  const page = `Frosty Dog January 9, 2028. ${'Other events and news. '.repeat(20)} Triple Tree Fly-In: dates coming soon.`;
  assert.deepEqual(findDateMentions(page, 2028, { near: 'Triple Tree Fly-In' }).dates, []);
  assert.equal(findDateMentions(page, 2028).dates.length, 1);
});

test('page text drops markup and decodes entities', () => {
  assert.equal(pageText('<p>Sep&nbsp;9&ndash;12,&#160;2027</p><script>var x = "May 1, 2027"</script>').trim(), 'Sep 9–12, 2027');
});

test('only events with an organizer page and an estimate coming up are checked', () => {
  const watch = datesToWatch(new Date('2026-11-02T12:00:00Z'));
  const find = (id, name) => watch.find(w => w.id === id && (!name || w.name === name));
  assert.equal(find('teardown').year, 2027);
  assert.equal(find('tripletree').year, 2028, 'the 2027 fly-in is confirmed, so watch for 2028');
  assert.equal(find('oshkosh').year, 2030);
  assert.equal(find('lobstermini'), undefined, 'set by state rule, nothing to watch');
  assert.ok(watch.every(w => /^https:\/\//.test(w.url)));
});
