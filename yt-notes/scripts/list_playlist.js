// yt-notes playlist lister. Run on a YouTube playlist page (https://www.youtube.com/playlist?list=...)
// with the browser's javascript tool. Scrolls to load up to ~200 entries, then returns
// {title, channel, url, count, total_seconds, videos: [{n, id, title, url, duration_seconds}]}.
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(2500);
const rows = () => document.querySelectorAll('ytd-playlist-video-renderer');
let last = -1;
for (let i = 0; i < 12 && rows().length !== last && rows().length < 200; i++) {
  last = rows().length;
  window.scrollTo(0, document.documentElement.scrollHeight);
  await sleep(1500);
}
const toSec = s => (s || '').trim().split(':').reduce((acc, x) => acc * 60 + (parseInt(x, 10) || 0), 0);
const videos = [...rows()].map((r, i) => {
  const a = r.querySelector('a#video-title');
  const href = a?.href || '';
  const id = (href.match(/[?&]v=([\w-]{6,})/) || [])[1];
  const dur = r.querySelector('ytd-thumbnail-overlay-time-status-renderer, badge-shape, .badge-shape-wiz__text')?.innerText;
  return id ? { n: i + 1, id, title: (a.innerText || a.title || '').trim(), url: `https://www.youtube.com/watch?v=${id}`, duration_seconds: toSec(dur) } : null;
}).filter(Boolean);
window.scrollTo(0, 0);
({
  title: (document.querySelector('yt-dynamic-sizing-formatted-string, h1') || {}).innerText?.trim() || document.title,
  channel: document.querySelector('ytd-channel-name a, a[href^="/@"]')?.innerText?.trim(),
  url: location.href,
  count: videos.length,
  total_seconds: videos.reduce((s, v) => s + v.duration_seconds, 0),
  videos
});
