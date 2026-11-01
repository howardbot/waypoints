# Waypoints

**Fly in. Sail in. Camp where you land.**

A personal adventure site: a logbook of trips and skills, plus a recommender for *combos*. A combo is a way to get somewhere (fly, sail, paddle, drive, ferry) plus what you do once you arrive (camp, dive, snorkel, spearfish, hike, fish, track day). Fly-in camping, sail-to-camp islands, diving or spearfishing at the end of the trip.

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

The catalog covers 21 trips worldwide: the US (including Alaska), the Caribbean, Mexico and Latin America, Europe, Africa and the Middle East, Asia, and Australia and New Zealand. The Discover page filters by region; "United States (all)" covers every US region.

- **Sources:** every trip lists the pages its facts come from (park services, airports, regulators), shown at the bottom of the trip page. Rules, prices and seasons change, so check them before a trip.
- **Photos:** every trip has a freely licensed photo from Wikimedia Commons ([`src/data/photos.js`](src/data/photos.js)), credited on the trip page and on `/credits/`. To use your own, drop it in `public/photos/` and add `image: '/photos/name.jpg'` to the trip.

## YouTube

Each trip has `youtube` search terms:

- **Watch on YouTube links** (free, no setup): open YouTube's live search for each term, so results are always current.
- **Recommended videos on the page** (free, needs a key): create a YouTube Data API v3 key in Google Cloud, then run

  ```bash
  npm run videos
  ```

  It asks for the key without echoing it, and writes the top results to `src/data/videos.json`. Commit that file and deploy; the key isn't saved anywhere. A full refresh uses about 40 searches, roughly 4,000 of the free 10,000 daily quota units. To drop an off-topic result for good, add its video id to the trip's `youtubeSkip` list.
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

The site is plain static files. `npm run deploy` builds it and runs it on your server, where only devices on your Tailscale network can reach it:

- an `nginx:alpine` container bound to `127.0.0.1` ([`deploy/`](deploy/))
- `tailscale serve` publishes it over HTTPS to your tailnet only (default port 8446)
- no public ports are opened, and other `tailscale serve` routes on the machine are left alone

Before the first deploy:

1. The server needs Docker with the Compose plugin, Tailscale logged in, and passwordless `sudo` for `docker` and `tailscale`.
2. `cp .env.deploy.example .env.deploy` and fill in the SSH target and key. The file is git-ignored.
3. Run `npm run deploy`. It prints the tailnet URL when it's done.

## Credits

Trip photos from Wikimedia Commons; authors and licenses are listed on the site's `/credits/` page. Icons adapted from [Lucide](https://lucide.dev) (ISC). Fonts: Barlow Condensed and IBM Plex (SIL Open Font License), via Google Fonts.
