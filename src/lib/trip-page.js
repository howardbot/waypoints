// Trip page: mark the trip done (it goes into your logbook), and save the YouTube (or any)
// videos that inspired it.
import { getVideos, addVideo, removeVideo, getDone, setDone, clearDone } from './store.js';
import { ICONS } from './icons.js';

const today = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in your time zone
const longDate = iso =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function initDone() {
  const open = document.querySelector('.js-done-open');
  const form = document.querySelector('.js-done-form');
  const summary = document.querySelector('.js-done-summary');
  if (!open || !form || !summary) return;
  const tripId = open.dataset.tripDone;
  const date = form.querySelector('#done-date');
  const note = form.querySelector('#done-note');
  let editing = false;

  const render = () => {
    const entry = getDone()[tripId];
    open.hidden = Boolean(entry) || editing;
    form.hidden = !editing;
    summary.hidden = !entry || editing;
    if (entry) {
      summary.querySelector('.js-done-text').textContent =
        [entry.date && `· ${longDate(entry.date)}`, entry.note && `· ${entry.note}`].filter(Boolean).join(' ');
    }
  };
  const edit = () => {
    const entry = getDone()[tripId];
    date.value = entry?.date || today();
    note.value = entry?.note || '';
    editing = true;
    render();
    date.focus();
  };

  open.addEventListener('click', edit);
  summary.querySelector('.js-done-edit').addEventListener('click', edit);
  summary.querySelector('.js-done-remove').addEventListener('click', () => clearDone(tripId));
  form.querySelector('.js-done-cancel').addEventListener('click', () => {
    editing = false;
    render();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!date.value) {
      date.setAttribute('aria-invalid', 'true');
      return;
    }
    date.removeAttribute('aria-invalid');
    editing = false;
    setDone(tripId, { date: date.value, note: note.value.trim() });
  });
  window.addEventListener('waypoints:change', render);
  window.addEventListener('storage', render);
  render();
}

function isWebUrl(value) {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function youtubeId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\.|^m\./, '');
    let id = null;
    if (host === 'youtu.be') id = url.pathname.slice(1);
    else if (host === 'youtube.com') id = url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
    return id && /^[\w-]{6,}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function icon(name, size) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  if (name === 'play') {
    svg.setAttribute('fill', 'currentColor');
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
  }
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', ICONS[name]);
  svg.append(path);
  return svg;
}

function videoCard(url, index) {
  const card = document.createElement('div');
  card.className = 'video';

  const thumb = document.createElement('a');
  thumb.className = 'video-thumb';
  thumb.href = url;
  thumb.target = '_blank';
  thumb.rel = 'noopener noreferrer';
  thumb.setAttribute('aria-label', 'Open video in a new tab');
  const id = youtubeId(url);
  if (id) {
    const img = document.createElement('img');
    img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    img.alt = '';
    img.loading = 'lazy';
    thumb.append(img);
  }
  const play = document.createElement('span');
  play.className = 'play';
  play.append(icon('play', 22));
  thumb.append(play);

  const meta = document.createElement('div');
  meta.className = 'video-meta';
  const title = document.createElement('span');
  title.className = 'video-title';
  title.textContent = id ? `YouTube · ${id}` : new URL(url).hostname;
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'video-remove';
  remove.dataset.remove = String(index);
  remove.setAttribute('aria-label', 'Remove video');
  remove.append(icon('x', 16));
  meta.append(title, remove);

  card.append(thumb, meta);
  return card;
}

export function initTripPage() {
  initDone();
  const root = document.querySelector('[data-videos]');
  if (!root) return;
  const tripId = root.dataset.videos;
  const form = root.querySelector('form');
  const input = root.querySelector('input');
  const list = root.querySelector('.js-video-list');
  const empty = root.querySelector('.js-video-empty');
  const error = root.querySelector('.js-video-error');

  const render = () => {
    const videos = getVideos(tripId);
    list.replaceChildren(...videos.map(videoCard));
    empty.hidden = videos.length > 0;
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    const url = input.value.trim();
    if (!isWebUrl(url)) {
      error.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    error.hidden = true;
    input.removeAttribute('aria-invalid');
    addVideo(tripId, url);
    input.value = '';
  });
  list.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('[data-remove]') : null;
    if (button) removeVideo(tripId, Number(button.dataset.remove));
  });
  window.addEventListener('waypoints:change', render);
  window.addEventListener('storage', render);
  render();
}
