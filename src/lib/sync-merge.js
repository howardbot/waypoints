// How saved state syncs between devices, shared by the browser (store.js, sync.js) and the
// server (deploy/sync/server.mjs). State is split into fields, one per item: "skills.flying",
// "saved.bvi", "plan.bvi", "done.bvi", "videos.bvi". Each field carries its value `v` and the
// time `t` it last changed; a removed item keeps a field with v: null, so the removal syncs too.
// Merging keeps the newer of each field, so edits to different items on two devices both survive.

export const KINDS = ['skills', 'saved', 'done', 'plan', 'videos'];
export const FIELD_PATTERN = /^(skills|saved|done|plan|videos)\.[A-Za-z0-9_-]{1,64}$/;
export const MAX_FIELDS = 5000;
const MAX_VALUE_BYTES = 4096;

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** The fields in a state object, as { field: value } (no times). */
export function toFields(data) {
  const fields = {};
  for (const [key, level] of Object.entries(isObject(data.skills) ? data.skills : {})) fields[`skills.${key}`] = level;
  for (const id of Array.isArray(data.saved) ? data.saved : []) fields[`saved.${id}`] = true;
  for (const kind of ['done', 'plan', 'videos']) {
    for (const [id, value] of Object.entries(isObject(data[kind]) ? data[kind] : {})) fields[`${kind}.${id}`] = value;
  }
  return fields;
}

/** Field names whose values differ between two `toFields` results. */
export function changedFields(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    f => JSON.stringify(before[f] ?? null) !== JSON.stringify(after[f] ?? null),
  );
}

/** Keep only well-formed fields: a known name, a time, and a small JSON value. Times are capped at `now`. */
export function cleanFields(fields, now = Date.now()) {
  if (!isObject(fields)) return null;
  const entries = Object.entries(fields);
  if (entries.length > MAX_FIELDS) return null;
  const clean = {};
  for (const [field, entry] of entries) {
    if (!FIELD_PATTERN.test(field) || !isObject(entry) || !Number.isFinite(entry.t) || entry.t < 0) continue;
    const v = entry.v ?? null;
    if (JSON.stringify(v).length > MAX_VALUE_BYTES) continue;
    clean[field] = { v, t: Math.min(entry.t, now) };
  }
  return clean;
}

/** The newer of each field from two { field: { v, t } } maps; on a tie, `base` wins. */
export function mergeFields(base, incoming) {
  const merged = { ...base };
  for (const [field, entry] of Object.entries(incoming)) {
    if (!merged[field] || entry.t > merged[field].t) merged[field] = entry;
  }
  return merged;
}
