// YouTube helpers shared by the trip page and scripts/fetch-videos.mjs.

export const searchUrl = query => `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
export const watchUrl = id => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
export const thumbUrl = id => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;

const ENTITIES = { '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>' };
// Decode the few entities the API uses, and drop invisible characters some titles carry.
const decode = text =>
  String(text ?? '')
    .replace(/&(amp|quot|#39|lt|gt);/g, m => ENTITIES[m])
    .replace(/[￼​-‍﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** A trip's videos minus the ones listed in its `youtubeSkip`. */
export const keepVideos = (trip, videos = []) => videos.filter(v => !(trip.youtubeSkip ?? []).includes(v.id));

/** Pull { id, title, channel, published } out of a YouTube Data API v3 search response. */
export function parseSearch(response) {
  return (response?.items ?? [])
    .filter(item => typeof item?.id?.videoId === 'string' && /^[\w-]{6,}$/.test(item.id.videoId))
    .map(item => ({
      id: item.id.videoId,
      title: decode(item.snippet?.title),
      channel: decode(item.snippet?.channelTitle),
      published: String(item.snippet?.publishedAt ?? '').slice(0, 10),
    }));
}
