// Dated events for trips that happen on specific days. The trip page shows the next date,
// or "last held" once every date has passed, and /status/ lists trips that need new dates.
// Only dates confirmed on the trip's sources go here; add next year's once they're announced.
export const EVENTS = {
  teardown: [{ name: 'Teardown', start: '2026-07-24', end: '2026-07-26' }],
  tripletree: [
    { name: 'Triple Tree Fly-In', start: '2026-09-21', end: '2026-09-27' },
    { name: 'Triple Tree Fly-In', start: '2027-09-20', end: '2027-09-26' },
  ],
  porttownsend: [
    { name: 'Timber framing course', start: '2026-06-22', end: '2026-06-27' },
    { name: 'Wooden Boat Festival', start: '2026-09-11', end: '2026-09-13' },
  ],
  ladakh: [
    { name: 'Ladakh Bike Week', start: '2026-09-01', end: '2026-09-07' },
    { name: 'Ladakh Bike Week', start: '2027-09-01', end: '2027-09-07' },
  ],
  supercon: [{ name: 'Hackaday Supercon', start: '2026-11-06', end: '2026-11-08' }],
  easternexpress: [{ name: '2026–27 season', start: '2026-12-21', end: '2027-03-10' }],
  embeddedworld: [{ name: 'embedded world', start: '2027-03-16', end: '2027-03-18' }],
  lyngen: [
    { name: 'SeilNorge departure', start: '2027-04-06', end: '2027-04-12' },
    { name: 'SeilNorge departure', start: '2027-05-03', end: '2027-05-09' },
  ],
  lobstermini: [{ name: 'Lobster mini-season', start: '2027-07-28', end: '2027-07-29' }],
};
