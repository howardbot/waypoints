// Dated events for trips that happen on specific days, so trips can be planned years ahead.
//
//   dates    [start, end] pairs confirmed on the organizer's own pages (cited in the trip's sources)
//   repeats  how the event usually falls, used to estimate the years nobody has announced yet:
//              { month, weekday, nth, offset, days }  the nth weekday of the month (-1 = last),
//                                                      moved `offset` days, lasting `days` days
//              { month, day, days }                    the same calendar dates every year
//            Without it, estimates keep the weekday and week of the month of the latest date.
//   official true when `repeats` is the organizer's own published rule, so its dates aren't estimates
//   usually  the pattern in words, shown after "Usually" on the trip page
//   every    years between editions (default 1)
//   check    { url, near }: the organizer page that announces dates, and words near them there;
//            each build looks there for the next estimated year (see lib/date-watch.js)
//
// Trip pages show the next few editions and mark estimates; add dates as organizers announce them.
export const EVENTS = {
  oshkosh: [
    {
      name: 'EAA AirVenture',
      check: { url: 'https://www.eaa.org/airventure', near: 'AirVenture' },
      usually: 'a week in late July',
      dates: [['2026-07-20', '2026-07-26'], ['2027-07-26', '2027-08-01'], ['2028-07-24', '2028-07-30'], ['2029-07-23', '2029-07-29']],
    },
  ],
  sunnfun: [
    {
      name: "SUN 'n FUN",
      check: { url: 'https://flysnf.org/' },
      usually: 'Tuesday to Sunday in early April',
      dates: [['2027-04-06', '2027-04-11'], ['2028-04-04', '2028-04-09'], ['2029-04-10', '2029-04-15'], ['2030-04-09', '2030-04-14']],
    },
  ],
  teardown: [
    {
      name: 'Teardown',
      check: { url: 'https://www.crowdsupply.com/teardown', near: 'Teardown' },
      usually: 'a Friday to Sunday in early summer',
      dates: [['2026-07-24', '2026-07-26']],
    },
  ],
  tripletree: [
    {
      name: 'Triple Tree Fly-In',
      check: { url: 'https://tta.aero/', near: 'Triple Tree Fly-In' },
      usually: 'Monday to Sunday of the last full week of September',
      repeats: { month: 9, weekday: 'Sun', nth: -1, offset: -6, days: 7 },
      dates: [['2026-09-21', '2026-09-27'], ['2027-09-20', '2027-09-26']],
    },
  ],
  moosehead: [
    {
      name: 'International Seaplane Fly-In',
      check: { url: 'https://www.seaplanefly-in.org' },
      usually: 'Thursday to Sunday after Labor Day',
      repeats: { month: 9, weekday: 'Mon', nth: 1, offset: 3, days: 4 },
      dates: [['2027-09-09', '2027-09-12']],
    },
  ],
  porttownsend: [
    {
      name: 'Timber framing course',
      check: { url: 'https://www.ptwoodschool.org/course-map', near: 'Timber Framing' },
      usually: 'a week in late June',
      dates: [['2026-06-22', '2026-06-27']],
    },
    {
      name: 'Wooden Boat Festival',
      check: { url: 'https://woodenboat.org/', near: 'Festival' },
      usually: 'Friday to Sunday after Labor Day',
      repeats: { month: 9, weekday: 'Mon', nth: 1, offset: 4, days: 3 },
      dates: [['2026-09-11', '2026-09-13']],
    },
  ],
  ladakh: [
    {
      name: 'Ladakh Bike Week',
      check: { url: 'https://tourism.ladakh.gov.in/events', near: 'Bike Week' },
      usually: 'September 1–7',
      repeats: { month: 9, day: 1, days: 7 },
      dates: [['2026-09-01', '2026-09-07'], ['2027-09-01', '2027-09-07'], ['2028-09-01', '2028-09-07']],
    },
  ],
  supercon: [
    {
      name: 'Hackaday Supercon',
      check: { url: 'https://hackaday.io/superconference', near: 'Supercon' },
      usually: 'a weekend in early November',
      dates: [['2026-11-06', '2026-11-08']],
    },
  ],
  makerfaire: [
    {
      name: 'Maker Faire Rome',
      check: { url: 'https://makerfairerome.eu/en/', near: 'Maker Faire Rome' },
      usually: 'a Friday to Sunday in October',
      dates: [['2026-10-23', '2026-10-25']],
    },
  ],
  arc: [
    {
      name: 'ARC, start to prize-giving',
      check: { url: 'https://www.worldcruising.com/arc/event.aspx', near: 'ARC' },
      usually: 'starts on the fourth Sunday of November',
      repeats: { month: 11, weekday: 'Sun', nth: 4, days: 28 },
      dates: [['2026-11-22', '2026-12-19']],
    },
  ],
  easternexpress: [
    {
      name: 'Touristic Eastern Express season',
      check: { url: 'https://www.tursab.org.tr/announcements', near: 'Eastern Express' },
      usually: 'late December to early March',
      repeats: { month: 12, day: 21, days: 80 },
      dates: [['2026-12-21', '2027-03-10']],
    },
  ],
  fosdem: [
    {
      name: 'FOSDEM',
      check: { url: 'https://fosdem.org/' },
      usually: 'a weekend around the start of February',
      dates: [['2027-01-30', '2027-01-31']],
    },
  ],
  embeddedworld: [
    {
      name: 'embedded world',
      check: { url: 'https://www.embedded-world.de/en' },
      usually: 'Tuesday to Thursday in March',
      dates: [['2027-03-16', '2027-03-18']],
    },
  ],
  lyngen: [
    {
      name: 'SeilNorge April departure',
      check: { url: 'https://seilnorge.no/product/ski-sail-lyngen-7-days/', near: 'Apr' },
      usually: 'early April',
      dates: [['2027-04-06', '2027-04-12']],
    },
    {
      name: 'SeilNorge May departure',
      check: { url: 'https://seilnorge.no/product/ski-sail-lyngen-7-days/', near: 'May' },
      usually: 'early May',
      dates: [['2027-05-03', '2027-05-09']],
    },
  ],
  lobstermini: [
    {
      name: 'Lobster mini-season',
      usually: 'the last consecutive Wednesday and Thursday of July, set by state rule',
      repeats: { month: 7, weekday: 'Thu', nth: -1, offset: -1, days: 2 },
      official: true,
      dates: [['2027-07-28', '2027-07-29']],
    },
  ],
  cccamp: [
    {
      name: 'Chaos Communication Camp',
      check: { url: 'https://events.ccc.de/', near: 'Camp' },
      usually: 'five days in August, every four years',
      every: 4,
      dates: [['2023-08-15', '2023-08-19']],
    },
  ],
};
