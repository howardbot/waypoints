// Months for trips whose season text the parser in src/lib/season.js can't read
// (or reads too loosely). 1 = January.
import { monthRange } from '../lib/season.js';

const ALL = monthRange(1, 12);

export const MONTHS_OVERRIDE = {
  freedive: ALL, // "Warm months": depends on your coast
  tando: monthRange(3, 11), // mudflat villages run their programs spring to autumn
  fangyuan: ALL, // tide-dependent tours, all year
  pecheapied: ALL, // big tides come every month
  palmersport: ALL, // events through the year
  razorclams: monthRange(9, 5), // digs open fall to spring
  jau: ALL, // dry season for beaches, wet season for the flooded forest
  sampo: monthRange(12, 4), // icebreaker cruises run while the gulf is frozen
  mdcrabs: monthRange(4, 12), // the season opens April 1
  porttownsend: monthRange(6, 9), // summer courses through the September festival
  mackinac: monthRange(6, 9),
};
