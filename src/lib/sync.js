// Syncs this browser's state with your other devices through the server (/api/sync, see
// deploy/sync/server.mjs): sends everything with when each item last changed, gets the merged
// state back and keeps whatever is newer. Runs when a page opens, shortly after each change and
// when you come back to the tab. Without the server (a local preview, offline) nothing breaks:
// changes wait in this browser and go out with the next sync.
import { localFields, applyFields } from './store.js';

const status = { state: 'starting', at: null, user: null };
let timer = null;
let running = null;
let again = false;

/** { state: 'starting' | 'ok' | 'offline' | 'off', at, user }; 'off' means no sync server here. */
export const syncStatus = () => ({ ...status });

function report(state, extra = {}) {
  Object.assign(status, { state }, extra);
  window.dispatchEvent(new CustomEvent('waypoints:sync', { detail: syncStatus() }));
}

const body = () => JSON.stringify({ fields: localFields() });

async function exchange() {
  try {
    const res = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(), cache: 'no-store' });
    if (res.status === 404) return report('off');
    if (!res.ok) throw new Error(`sync: ${res.status}`);
    const { fields, user } = await res.json();
    applyFields(fields);
    report('ok', { at: Date.now(), user });
  } catch {
    report('offline');
  }
}

export async function syncNow() {
  if (status.state === 'off') return; // no sync server on this site (a local preview): stop asking
  if (running) {
    again = true;
    return running;
  }
  running = exchange();
  await running;
  running = null;
  if (again) {
    again = false;
    await syncNow();
  }
}

export function startSync() {
  window.addEventListener('waypoints:change', event => {
    if (event.detail?.source !== 'local') return; // changes that came from a sync don't need sending back
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      syncNow();
    }, 1500);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow();
  });
  // Closing the tab right after a change: send it anyway.
  window.addEventListener('pagehide', () => {
    if (timer && status.state !== 'off') navigator.sendBeacon?.('/api/sync', new Blob([body()], { type: 'application/json' }));
  });
  syncNow();
}
