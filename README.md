# Waypoints

**Fly in. Sail in. Camp where you land.**

A personal adventure site: a logbook of trips and skills, plus a recommender for *combos*. A combo is a way to get somewhere (fly, sail, paddle, drive, ferry) plus what you do once you arrive (camp, dive, snorkel, spearfish, clams & crabs, hike, fish, track day). Fly-in camping, sail-to-camp islands, diving or spearfishing at the end of the trip.

Flying comes in two kinds. **Fly myself** means you fly the plane, alone or with your instructor, and those trips follow your flying skill track. **Small aircraft** means someone else flies a bush plane, floatplane, air taxi, helicopter, glider or balloon that is part of the adventure. An airline flight that just gets you to a place isn't listed as a way there.

Trips are ranked for the skills you have today, so each one shows as:

- **Ready now**: you can go.
- **With a guide**: you can go with an instructor, guide or skipper.
- **Goal trip**: unlocks as your skills move forward.

## Pages

| Path | What it is |
| --- | --- |
| `/` | Home: combo builder, recommended trips, skills in progress, logbook totals |
| `/discover/` | The recommender: filter by way there, activities, region and skills |
| `/trips/<id>/` | One trip: ways to get there, your path from first try to doing it yourself, pack list, saved videos |
| `/logbook/` | Skill tracks (tap the step you're on), totals by activity, wishlist |
| `/entries/` | Trip reports, builds and skill logs written in Markdown |

## How the recommender works

Each trip in [`src/data/trips.js`](src/data/trips.js) can name the skill it depends on:

```js
req: { skill: 'fly', readyAt: 'ppl', guideAt: 'student' }
```

That reads: ready at Private pilot, doable with an instructor from Student pilot, a goal trip before that. Trips with `req: null` are always ready.

Scores add up from four parts ([`src/lib/recommend.js`](src/lib/recommend.js)):

- up to 35 for a matching way of getting there
- up to 40 for the share of your picked activities the trip covers
- 20 / 14 / 6 for ready now / with a guide / goal trip
- +12 for new-to-you trips when "Mix in things I've never tried" is on

Your skill levels, saved trips and saved video links stay in the browser (`localStorage`). There are no accounts and no backend.

## Trips, photos and sources

The catalog covers 260 trips worldwide: the US (including Alaska and Hawaii), Canada, the Caribbean, Mexico and Latin America, Europe, Africa and the Middle East, Asia, Australia and New Zealand, the Pacific and the polar regions. [`researched.js`](src/data/catalog/researched.js) holds 168 trips suggested in four rounds of ChatGPT and Gemini research; each was checked before it went in (every source opened, specific claims matched against the sources, anything unconfirmed corrected or removed), and the trip page credits the model that found it. The Discover page filters by region ("United States (all)" covers every US region) and shows 18 results at a time. The first 21 trips are in `src/data/trips.js`; the rest are in `src/data/catalog/`, in the same format. [`journeys.js`](src/data/catalog/journeys.js) collects new ways to travel through beautiful places: narrowboats and houseboats, scenic trains, slow ferries, bike paths, horses, dog sleds and balloons. [`shore.js`](src/data/catalog/shore.js) collects "chasing the sea" (赶海) trips: gathering clams and shellfish on the flats at low tide, and catching crabs and lobsters by hand, net, trap or pot (no rod fishing), from China, Japan, Korea and Taiwan to Brittany and the US coasts. These show under the **Clams & crabs** activity. The **Views** activity marks the most scenic trips.

- **Sources:** every trip lists the pages its facts come from (park services, airports, regulators), shown at the bottom of the trip page. Rules, prices and seasons change, so check them before a trip.
- **Photos:** every trip has a freely licensed photo from Wikimedia Commons ([`src/data/photos.js`](src/data/photos.js)), credited on the trip page and on `/credits/`. To use your own, drop it in `public/photos/` and add `image: '/photos/name.jpg'` to the trip.

## YouTube

Each trip has `youtube` search terms:

- **Watch on YouTube links** (free, no setup): open YouTube's live search for each term, so results are always current.
- **Recommended videos on the page** (free, needs a YouTube Data API v3 key from Google Cloud): the server refreshes them every day by itself (see Deploy), within a budget of 80 searches (8,000 of the free 10,000 daily quota units). New trips go first, then any trip whose videos are more than a week old, so it scales to any number of trips; if the quota runs out mid-run, it keeps what it fetched and picks up the rest the next day. To drop an off-topic result for good, add its video id to the trip's `youtubeSkip` list. To refresh by hand on any machine, run `npm run videos`; it asks for the key with hidden input and writes `src/data/videos.json`.
- **Your saved videos:** paste any link on a trip page to keep it with that trip.

## Make it yours

- **Add a trip:** copy an object in `src/data/trips.js`. Run `npm test` and it checks ids, skills, levels, photos and sources.
- **Your numbers:** replace the `null` values in `src/data/logbook.js`.
- **Skill tracks and unlock text:** `src/data/skills.js`.
- **Write an entry:** copy `src/content/entries/example-entry.md`, then set `draft: false`.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm test         # recommender and data checks
npm run build    # static site in dist/
```

## Deploy: private to your tailnet

The server builds and serves the site by itself, straight from this GitHub repo. No laptop is involved:

- **Every hour** it checks GitHub and rebuilds if there are new commits, so a push (even from the GitHub website) goes live within the hour.
- **Every day** (early morning, server time) it refreshes the YouTube videos that are due and rebuilds.
- Builds run in a throwaway `node:20-alpine` container, so the server needs no Node install. If a refresh or build fails, the last good site stays up.
- The site is an `nginx:alpine` container bound to `127.0.0.1`, published by `tailscale serve` over HTTPS to your tailnet only (default port 8446). No public ports are opened, and other `tailscale serve` routes on the machine are left alone.

One-time server setup (needs Docker with Compose, Tailscale logged in, and passwordless `sudo`):

```bash
git clone https://github.com/howardbot/waypoints.git ~/waypoints/repo
sudo bash ~/waypoints/repo/deploy/install.sh        # timers + Tailscale Serve
bash ~/waypoints/repo/deploy/set-youtube-key.sh     # stores the key, readable by you only
sudo systemctl start waypoints-videos.service       # first build with fresh videos
```

Handy commands on the server:

```bash
systemctl list-timers 'waypoints-*'                  # when the next runs are
journalctl -u waypoints-update -u waypoints-videos   # what happened
sudo systemctl start waypoints-update.service        # rebuild now
```

From your laptop, `npm run deploy` does the same "rebuild now" over SSH after checking you've pushed (set it up with `cp .env.deploy.example .env.deploy`).

## Credits

Trip photos from Wikimedia Commons; authors and licenses are listed on the site's `/credits/` page. Icons adapted from [Lucide](https://lucide.dev) (ISC). Fonts: Barlow Condensed and IBM Plex (SIL Open Font License), via Google Fonts.
