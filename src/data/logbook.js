// Running totals for the home page and the Logbook. Replace null with your numbers.

export const STATS = {
  flightHours: { label: 'Flight hours', unit: 'hrs', value: null },
  landings: { label: 'Landings', unit: 'landings', value: null },
  airports: { label: 'Airports visited', unit: 'airports', value: null },
  dives: { label: 'Logged dives', unit: 'dives', value: null },
  maxDepthFt: { label: 'Max depth', unit: 'ft max depth', value: null },
  nmSailed: { label: 'Nautical miles sailed', unit: 'nm', value: null },
  nightsAboard: { label: 'Nights aboard', unit: 'nights aboard', value: null },
  spearSessions: { label: 'Spearfishing sessions', unit: 'sessions', value: null },
  lionfish: { label: 'Lionfish taken', unit: 'lionfish', value: null },
  trailMiles: { label: 'Trail miles', unit: 'trail miles', value: null },
  nightsCamped: { label: 'Nights camped', unit: 'nights camped', value: null },
  trackDays: { label: 'Track days', unit: 'days', value: null },
  tracks: { label: 'Tracks driven', unit: 'tracks', value: null },
  woodBuilds: { label: 'Wood builds', unit: 'wood builds', value: null },
  pcbs: { label: 'PCBs designed', unit: 'PCBs', value: null },
};

// One row per activity on the Logbook page. `last` is your latest entry, e.g. 'Oct 2026 · First solo'.
export const LOGBOOK = [
  { activity: 'Flying', stats: ['flightHours', 'landings', 'airports'], last: null },
  { activity: 'Scuba', stats: ['dives', 'maxDepthFt'], last: null },
  { activity: 'Sailing', stats: ['nmSailed', 'nightsAboard'], last: null },
  { activity: 'Spearfishing', stats: ['spearSessions', 'lionfish'], last: null },
  { activity: 'Hiking & camping', stats: ['trailMiles', 'nightsCamped'], last: null },
  { activity: 'Track days', stats: ['trackDays', 'tracks'], last: null },
  { activity: 'Workshop', stats: ['woodBuilds', 'pcbs'], last: null },
];

export const HOME_TILES = ['flightHours', 'dives', 'nmSailed', 'trailMiles', 'nightsCamped', 'trackDays'];

export const ENTRY_KINDS = { trip: 'Trip report', build: 'Build', skill: 'Skill log' };

export const fmt = value => (value == null ? '—' : Number(value).toLocaleString('en-US'));
