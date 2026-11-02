import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { toFields, changedFields, cleanFields, mergeFields } from '../src/lib/sync-merge.js';
import { createSyncServer, planOf } from '../deploy/sync/server.mjs';

test('state splits into one field per item, and merging keeps the newer of each', () => {
  const fields = toFields({ skills: { flying: 'solo' }, saved: ['bvi'], plan: { bvi: { year: 2027, month: 1 } }, done: {}, videos: {} });
  assert.deepEqual(fields, { 'skills.flying': 'solo', 'saved.bvi': true, 'plan.bvi': { year: 2027, month: 1 } });
  assert.deepEqual(changedFields(fields, { ...fields, 'saved.dahab': true, 'saved.bvi': undefined }), ['saved.bvi', 'saved.dahab']);

  const laptop = { 'saved.bvi': { v: true, t: 10 }, 'plan.bvi': { v: { year: 2027, month: 1 }, t: 10 } };
  const phone = { 'saved.dahab': { v: true, t: 20 }, 'plan.bvi': { v: { year: 2027, month: 3 }, t: 30 } };
  const merged = mergeFields(laptop, phone);
  assert.deepEqual(Object.keys(merged).sort(), ['plan.bvi', 'saved.bvi', 'saved.dahab']);
  assert.equal(merged['plan.bvi'].v.month, 3, 'the later edit wins');
  assert.equal(mergeFields(merged, { 'plan.bvi': { v: { year: 2027, month: 9 }, t: 30 } })['plan.bvi'].v.month, 3, 'ties keep the stored one');
});

test('the server only accepts well-formed fields and caps future times', () => {
  assert.equal(cleanFields('nope'), null);
  const clean = cleanFields(
    { 'saved.bvi': { v: true, t: 5 }, 'evil.x': { v: 1, t: 1 }, 'saved.../x': { v: true, t: 1 }, 'plan.a': { v: 'x'.repeat(5000), t: 1 }, 'done.b': { v: null, t: 9e15 } },
    1000,
  );
  assert.deepEqual(clean, { 'saved.bvi': { v: true, t: 5 }, 'done.b': { v: null, t: 1000 } });
});

test('the browser store notes when items change and takes newer synced ones', async () => {
  const items = new Map();
  globalThis.localStorage = { getItem: k => items.get(k) ?? null, setItem: (k, v) => items.set(k, String(v)) };
  globalThis.window = new EventTarget();
  const store = await import('../src/lib/store.js');
  const changes = [];
  window.addEventListener('waypoints:change', e => changes.push(e.detail?.source));

  store.toggleSaved('bvi');
  store.setPlan('bvi', { year: 2027, month: 1 });
  const fields = store.localFields();
  assert.ok(fields['saved.bvi'].t > 1 && fields['plan.bvi'].v.month === 1);
  store.toggleSaved('bvi');
  assert.equal(store.localFields()['saved.bvi'].v, null, 'a removal is kept so it syncs');
  assert.deepEqual(changes, ['local', 'local', 'local']);

  const later = Date.now() + 1000;
  const changed = store.applyFields({
    'saved.dahab': { v: true, t: later },
    'plan.bvi': { v: { year: 2027, month: 6 }, t: later },
    'saved.bvi': { v: true, t: 1 }, // older than this browser's removal: ignored
  });
  assert.ok(changed);
  assert.deepEqual(store.getSaved(), ['dahab']);
  assert.equal(store.getPlan().bvi.month, 6);
  assert.equal(changes.at(-1), 'sync', "synced changes aren't sent back as local edits");
  assert.equal(store.applyFields({ 'saved.dahab': { v: true, t: later } }), false, 'nothing newer, nothing changes');
});

const dir = await mkdtemp(join(tmpdir(), 'waypoints-sync-'));
after(() => rm(dir, { recursive: true, force: true }));

async function withServer(run) {
  const server = createSyncServer({ dataDir: dir, site: 'https://site.test' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (path, { user, fields, raw, method = fields || raw ? 'POST' : 'GET' } = {}) =>
    fetch(`${base}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(user ? { 'Tailscale-User-Login': user } : {}) },
      body: raw ?? (fields ? JSON.stringify({ fields }) : undefined),
    });
  try {
    await run(call);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

test('the sync server merges each person’s devices and keeps people apart', async () => {
  await withServer(async call => {
    const t = Date.now() - 10_000;
    const laptop = await call('/api/sync', { user: 'pilot@example.test', fields: { 'saved.bvi': { v: true, t }, 'plan.bvi': { v: { year: 2027, month: 1 }, t } } });
    assert.equal(laptop.status, 200);
    assert.equal((await laptop.json()).user, 'pilot@example.test');

    const phone = await (await call('/api/sync', { user: 'pilot@example.test', fields: { 'saved.dahab': { v: true, t: t + 1 }, 'plan.bvi': { v: { year: 2027, month: 4 }, t: t + 2 } } })).json();
    assert.deepEqual(Object.keys(phone.fields).sort(), ['plan.bvi', 'saved.bvi', 'saved.dahab']);
    assert.equal(phone.fields['plan.bvi'].v.month, 4);

    const someoneElse = await (await call('/api/sync', { user: 'friend@example.test' })).json();
    assert.deepEqual(someoneElse.fields, {});
    assert.equal((await readdir(dir)).filter(f => f.endsWith('.json')).length, 1, 'one file per person, no temp files left');

    assert.equal((await call('/api/sync', { raw: '{not json' })).status, 400);
    assert.equal((await call('/api/sync', { raw: JSON.stringify({ fields: 'x' }) })).status, 400);
    assert.equal((await call('/api/nope')).status, 404);
  });
});

test('your calendar feed has the events plus your plan', async () => {
  await withServer(async call => {
    const t = Date.now() - 1000;
    await call('/api/sync', {
      user: 'flyer@example.test',
      fields: { 'plan.tripletree': { v: { year: 2027, month: 9 }, t }, 'plan.johnson': { v: { year: 2027, month: 7 }, t }, 'plan.bogus': { v: 'x', t } },
    });
    const res = await call('/api/calendar.ics', { user: 'flyer@example.test' });
    assert.match(res.headers.get('content-type'), /^text\/calendar/);
    const text = await res.text();
    assert.match(text, /SUMMARY:Planned: Triple Tree Fly-In\r\n/);
    assert.match(text, /SUMMARY:Plan: Johnson Creek\r\n/);
    assert.match(text, /URL:https:\/\/site\.test\/trips\/johnson\//);
    assert.doesNotMatch(await (await call('/api/calendar.ics', { user: 'other@example.test' })).text(), /Planned:/);
  });
  assert.deepEqual(planOf({ 'plan.a': { v: { year: 2027, month: 13 } }, 'plan.b': { v: { year: 2027, month: 2 } } }), { b: { year: 2027, month: 2 } });
});
