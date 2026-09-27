// yt-notes caption capture. Run in the YouTube watch page with the browser's javascript tool.
// 1) waits out pre-roll ads (their captions were being captured by mistake),
// 2) captures the player's own caption request (direct timedtext downloads come back empty),
// 3) keeps only responses for THIS video id, picks the longest, 4) sanity-checks the length.
// Returns {meta, total, chunks, warning?}. Then read window.__tx.slice(0,15000), slice(15000,30000), ...
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(2500);
const p = document.querySelector('#movie_player');
const isAd = () => !!p && (p.classList.contains('ad-showing') || p.classList.contains('ad-interrupting'));
// Wait up to 120 s for ads to finish, clicking "Skip" when it appears.
for (let i = 0; i < 120 && isAd(); i++) {
  document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern')?.click();
  await sleep(1000);
}
const adStillShowing = isAd();

window.__caps = [];
if (!window.__capHooked) {
  window.__capHooked = true;
  const oo = XMLHttpRequest.prototype.open, os = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__u = String(u); return oo.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', () => {
      if (this.__u.includes('timedtext') && this.responseText) window.__caps.push({ url: this.__u, text: this.responseText });
    });
    return os.apply(this, arguments);
  };
  const of = window.fetch;
  window.fetch = async function (...a) {
    const r = await of.apply(this, a);
    try {
      const u = String(a[0]?.url || a[0]);
      if (u.includes('timedtext')) r.clone().text().then(t => t && window.__caps.push({ url: u, text: t }));
    } catch (e) {}
    return r;
  };
}

const pr = p?.getPlayerResponse?.() || window.ytInitialPlayerResponse || {};
const vd = pr.videoDetails || {};
const videoId = vd.videoId || new URL(location.href).searchParams.get('v');
const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
const en = tracks.find(t => t.languageCode.startsWith('en') && !t.kind) || tracks.find(t => t.languageCode.startsWith('en')) || tracks[0];
const meta = {
  videoId, title: vd.title, channel: vd.author, lengthSeconds: Number(vd.lengthSeconds) || null,
  date: pr.microformat?.playerMicroformatRenderer?.publishDate,
  captionTrack: en ? `${en.languageCode} (${en.kind || 'manual'})` : 'NONE',
  descriptionStart: (vd.shortDescription || '').slice(0, 2500)
};

let result;
if (!en) { window.__tx = ''; result = { meta, total: 0, chunks: 0, error: 'NO_SUBTITLES' }; }
else {
  p.pauseVideo?.();
  p.unloadModule?.('captions'); await sleep(1000);
  p.loadModule?.('captions'); await sleep(1000);
  p.setOption?.('captions', 'track', { languageCode: en.languageCode });
  const mine = () => window.__caps.filter(c => c.url.includes('v=' + videoId));
  for (let i = 0; i < 12 && !mine().length; i++) await sleep(1000);

  let best = null;
  for (const c of mine()) {
    try { const j = JSON.parse(c.text); if (j.events?.length && (!best || j.events.length > best.events.length)) best = j; } catch (e) {}
  }
  if (!best) {
    window.__tx = '';
    result = { meta, total: 0, chunks: 0, error: adStillShowing ? 'AD_PLAYING: wait for the ad to end, then run again' : 'CAPTURE_FAILED: play the video ~5 s with CC on, then run again' };
  } else {
    const lines = []; let buf = '', start = 0;
    const ts = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    for (const e of best.events) {
      if (!e.segs) continue;
      const s = Math.floor(e.tStartMs / 1000); if (!buf) start = s;
      buf += e.segs.map(x => x.utf8).join('').replace(/\n/g, ' ') + ' ';
      if (buf.length > 500) { lines.push(`[${ts(start)}] ` + buf.trim()); buf = ''; }
    }
    if (buf.trim()) lines.push(`[${ts(start)}] ` + buf.trim());
    window.__tx = lines.join('\n');
    result = { meta, total: window.__tx.length, chunks: Math.ceil(window.__tx.length / 15000) };
    // Speech is ~12-15 characters per second. Far below that means a partial capture.
    if (meta.lengthSeconds && window.__tx.length < meta.lengthSeconds * 4)
      result.warning = `SHORT: ${window.__tx.length} chars for ${meta.lengthSeconds}s of video; likely partial. Run again.`;
  }
}
result;
