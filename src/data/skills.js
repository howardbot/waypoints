// Skill tracks. A trip's `req` points at one of these levels (see trips.js),
// and the recommender compares it with the level you're on.

export const TRACKS = [
  {
    key: 'fly',
    name: 'Flying',
    icon: 'fly',
    levels: [
      { id: 'none', label: 'Not yet' },
      { id: 'student', label: 'Student pilot' },
      { id: 'solo', label: 'Soloed' },
      { id: 'ppl', label: 'Private pilot' },
    ],
    unlock: {
      none: 'Book a discovery flight to get started.',
      student: 'Unlocked now: Catalina as a dual cross-country with your instructor. At Private pilot: fly yourself in.',
      solo: 'At Private pilot: fly yourself to Catalina, then Johnson Creek and a seaplane rating.',
      ppl: 'Fly-in camping is open. Add a mountain-flying course before the Idaho backcountry.',
    },
  },
  {
    key: 'dive',
    name: 'Scuba',
    icon: 'dive',
    levels: [
      { id: 'none', label: 'Not yet' },
      { id: 'training', label: 'In training' },
      { id: 'ow', label: 'Open Water' },
      { id: 'aow', label: 'Advanced' },
    ],
    unlock: {
      none: 'Start an Open Water course. Snorkel trips are ready now.',
      training: 'At Open Water: Catalina kelp dives and lionfish charters in the Keys.',
      ow: 'Unlocked: guided reef and kelp dives. At Advanced: deeper and night dives.',
      aow: 'Nitrox is a good next step for longer bottom times.',
    },
  },
  {
    key: 'sail',
    name: 'Sailing',
    icon: 'sail',
    levels: [
      { id: 'none', label: 'Not yet' },
      { id: 'crew', label: 'Crew' },
      { id: 'day', label: 'Day skipper' },
      { id: 'bareboat', label: 'Bareboat' },
    ],
    unlock: {
      none: 'Crew for a friend or take a keelboat course.',
      crew: 'At Day skipper: day sails out of your home harbor.',
      day: 'At Bareboat: Sucia Island and Catalina with you in command.',
      bareboat: 'Unlocked: bareboat charters and sail-to-camp islands.',
    },
  },
  {
    key: 'freedive',
    name: 'Freediving',
    icon: 'spearfish',
    levels: [
      { id: 'none', label: 'Not yet' },
      { id: 'course', label: 'Beginner course' },
      { id: 'spear', label: 'Spearfishing' },
    ],
    unlock: {
      none: 'A beginner freediving course is the first step to spearfishing.',
      course: 'Unlocked: a first spearfishing trip with a buddy, outside protected areas.',
      spear: 'Lionfish hunts and kelp-forest spearfishing are open to you.',
    },
  },
];

// Where a new visitor starts. Your own levels are saved in the browser from the Logbook page.
export const DEFAULT_SKILLS = { fly: 'student', dive: 'training', sail: 'day', freedive: 'none' };
