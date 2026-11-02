// Build-time only (uses the file system). The server downloads each Commons photo once into
// public/photos/commons/ (see scripts/fetch-photos.mjs); when every size of a photo is there,
// pages use the local copies instead of loading them from Wikimedia.
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const LOCAL_DIR = join(process.cwd(), 'public', 'photos', 'commons');

/** Local file name for a Commons URL: stable, and new if the trip's photo changes. */
export const photoFile = url => `${createHash('sha1').update(url).digest('hex').slice(0, 16)}.jpg`;

/** Every image URL a photo uses: its src plus each srcset entry. */
export const photoUrls = photo =>
  [photo.src, ...String(photo.srcset ?? '').split(',').map(part => part.trim().split(/\s+/)[0])].filter(Boolean);

/** The photo with local paths if all its sizes are downloaded, otherwise unchanged. */
export function localize(photo) {
  if (!photo?.src) return photo;
  if (!photoUrls(photo).every(url => existsSync(join(LOCAL_DIR, photoFile(url))))) return photo;
  const local = url => `/photos/commons/${photoFile(url)}`;
  const srcset = String(photo.srcset ?? '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [url, width] = part.split(/\s+/);
      return `${local(url)} ${width}`;
    })
    .join(', ');
  return { ...photo, src: local(photo.src), srcset };
}
