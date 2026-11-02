// Trip cards built in the browser from /trips.json records. Same markup as
// components/TripCard.astro, so the styles and client.js syncing work unchanged.
import { ICONS } from './icons.js';
import { LABEL } from '../data/meta.js';
import { STATE_LABEL } from './recommend.js';

const SVG = 'http://www.w3.org/2000/svg';

export function icon(name, size = 18, strokeWidth = 1.75, className = '') {
  const svg = document.createElementNS(SVG, 'svg');
  for (const [k, v] of Object.entries({
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true',
  })) svg.setAttribute(k, String(v));
  if (className) svg.setAttribute('class', className);
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', ICONS[name] ?? '');
  svg.append(path);
  return svg;
}

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
};

function photo(trip, height, isNew) {
  const box = el('div', 'photo');
  box.style.cssText = `--tone:${trip.tone ?? '#1c3346'};height:${height}px`;
  const src = trip.image ?? trip.photo?.src;
  if (src) {
    const img = document.createElement('img');
    img.src = src;
    if (!trip.image && trip.photo?.srcset) {
      img.srcset = trip.photo.srcset;
      img.sizes = '(min-width: 1240px) 400px, (min-width: 700px) 50vw, 100vw';
    }
    img.alt = trip.image ? trip.label : trip.photo?.alt ?? trip.label;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    box.append(img);
  } else {
    box.append(el('span', 'photo-label', `PHOTO · ${trip.label}`));
  }
  if (isNew) {
    const tag = el('span', 'new-tag');
    tag.append(icon('sparkle', 13, 2), 'NEW TO YOU');
    box.append(tag);
  }
  return box;
}

function badge(req) {
  const span = el('span', 'badge');
  span.dataset.state = 'ready';
  span.dataset.req = JSON.stringify(req);
  span.dataset.guided = 'false';
  span.dataset.goalLabel = STATE_LABEL.goal;
  span.append(icon('check', 15, 2.25, 'bi bi-ready'), icon('guide', 15, 2, 'bi bi-guided'), icon('lock', 15, 2, 'bi bi-goal'));
  span.append(el('span', 'badge-label', STATE_LABEL.ready));
  return span;
}

/**
 * One trip card. `match`: the Discover version, with the match bar, why it matched and a
 * Save button; otherwise the whole card links to the trip. client.js fills in readiness.
 */
export function tripCard(trip, { match = false } = {}) {
  const href = `/trips/${trip.id}/`;
  const card = el('article', `trip-card ${match ? 'is-match' : 'is-linked'}`);
  card.dataset.tripId = trip.id;
  card.append(photo(trip, match ? 140 : 176, match && trip.isNew));

  const body = el('div', 'trip-body');
  const chain = el('span', 'trip-chain');
  for (const mode of trip.get) {
    const part = el('span');
    part.append(icon(mode, 14, 1.9), LABEL[mode].toUpperCase());
    chain.append(part);
  }
  chain.append(el('span', '', `→ ${trip.do.map(a => LABEL[a].toUpperCase()).join(' · ')}`));

  const title = el('h3', 'trip-title');
  const link = el('a', '', trip.title);
  link.href = href;
  title.append(link);

  const ready = el('div', 'trip-ready');
  const note = el('span', 'js-note trip-note', trip.notes?.ready ?? '');
  note.dataset.req = JSON.stringify(trip.req);
  note.dataset.notes = JSON.stringify(trip.notes ?? {});
  ready.append(badge(trip.req), note);

  body.append(chain, title, el('p', 'trip-place', match ? `${trip.place} · ${trip.season} · ${trip.length}` : trip.place), ready);

  if (match) {
    const meter = el('div', 'match');
    const bar = el('div', 'match-bar');
    bar.append(el('span', 'js-bar'));
    meter.append(bar, el('span', 'mono js-score'));
    const actions = el('div', 'trip-actions');
    const details = el('a', 'btn btn-dark', 'Details');
    details.href = href;
    const save = el('button', 'btn btn-outline btn-save');
    save.type = 'button';
    save.dataset.save = trip.id;
    save.dataset.saveText = 'Save';
    save.dataset.savedText = 'Saved';
    save.setAttribute('aria-pressed', 'false');
    save.append(icon('bookmark', 16, 2), el('span', 'js-save-label', 'Save'));
    actions.append(details, save);
    body.append(meter, el('span', 'trip-why js-why'), actions);
  }
  card.append(body);
  return card;
}
