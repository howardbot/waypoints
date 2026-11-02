// Labels and lists shared by the server and the browser. Kept apart from the trip
// catalog so pages can use them without downloading every trip.

// fly: you fly the plane yourself (or with your instructor). air: someone else flies a small
// aircraft that is part of the adventure (bush plane, floatplane, air taxi, helicopter, glider
// ride, balloon). An airline flight just to reach a place doesn't count as a way there.
// boat: a boat you drive yourself or ride slowly (narrowboat, houseboat, river boat).
// horse: riding animals (horses, camels). sled: snow travel (dog sled, snowmobile, skis).
// make: workshop and maker trips. forage: "chasing the sea" (赶海) and its cousins: gathering
// clams, cockles and other shellfish at low tide, and catching crabs and lobsters by hand,
// net, trap or pot. No rod fishing (that's fish).
export const MODES = ['fly', 'air', 'sail', 'paddle', 'drive', 'ferry', 'boat', 'train', 'bike', 'horse', 'sled'];
export const ACTIVITIES = ['views', 'camp', 'dive', 'snorkel', 'spearfish', 'forage', 'hike', 'fish', 'track', 'shoot', 'make'];

export const LABEL = {
  fly: 'Fly myself', air: 'Small aircraft', sail: 'Sail', paddle: 'Paddle', drive: 'Drive', ferry: 'Ferry',
  boat: 'Boat', train: 'Train', bike: 'Bike', horse: 'Horse & camel', sled: 'Snow',
  views: 'Views', camp: 'Camp', dive: 'Dive', snorkel: 'Snorkel', spearfish: 'Spearfish', forage: 'Clams & crabs', hike: 'Hike', fish: 'Fish', track: 'Track day', shoot: 'Shoot', make: 'Workshop',
};

// Which research model suggested a trip (see catalog/researched.js).
export const VIA = { chatgpt: 'ChatGPT', gemini: 'Gemini', both: 'ChatGPT and Gemini' };

// 'us' matches every 'us-*' region; a trip with region 'any' shows everywhere.
export const REGIONS = [
  { id: 'any', label: 'Anywhere in the world' },
  { id: 'us', label: 'United States (all)' },
  { id: 'us-west', label: 'US · West Coast' },
  { id: 'us-mountain', label: 'US · Mountain West' },
  { id: 'us-central', label: 'US · Central & Midwest' },
  { id: 'us-southeast', label: 'US · Southeast & Florida' },
  { id: 'us-northeast', label: 'US · Northeast & Mid-Atlantic' },
  { id: 'us-alaska', label: 'US · Alaska' },
  { id: 'us-hawaii', label: 'US · Hawaii' },
  { id: 'canada', label: 'Canada' },
  { id: 'caribbean', label: 'Caribbean & Bahamas' },
  { id: 'latam', label: 'Mexico & Latin America' },
  { id: 'europe', label: 'Europe' },
  { id: 'africa', label: 'Africa & Middle East' },
  { id: 'asia', label: 'Asia' },
  { id: 'oceania', label: 'Australia & New Zealand' },
];
