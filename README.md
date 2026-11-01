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

## Make it yours

- **Add a trip:** copy an object in `src/data/trips.js`. Run `npm test` and it checks that ids, skills and levels line up.
- **Your numbers:** replace the `null` values in `src/data/logbook.js`.
- **Skill tracks and unlock text:** `src/data/skills.js`.
- **Write an entry:** copy `src/content/entries/example-entry.md`, then set `draft: false`.
- **Photos:** put them in `public/photos/` and add `image: '/photos/name.jpg'` to a trip.

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

Icons adapted from [Lucide](https://lucide.dev) (ISC). Fonts: Barlow Condensed and IBM Plex (SIL Open Font License), via Google Fonts.
