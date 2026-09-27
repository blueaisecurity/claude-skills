// Split a long timestamped transcript into chunks for part-by-part summarising.
//
// Usage:
//   node chunk_transcript.js transcript.txt [--meta transcript.meta.json] [--out chunks]
//                            [--min-minutes 60] [--min-words 12000] [--target-minutes 15] [--force]
//
// Input lines look like "[12:34] text ..." (the format both caption routes produce; minutes may exceed 59).
// Prints MODE=single when the video is short enough to handle in one pass (nothing is written),
// otherwise MODE=chunked and writes <out>/chunk-01.txt ... plus <out>/index.json.
//
// Chunks follow the creator's chapters when there are at least 2; short chapters are merged and very long
// ones split. Chapters come from the meta file's "chapters" (yt-dlp), or else from the timestamps in its
// "description" / "descriptionStart" (the browser route), using YouTube's rules: the list starts at 0:00,
// has at least 3 entries and goes up. Without chapters, chunks are ~target-minutes long, cut at a line boundary.
// Node.js only, no packages.
const fs = require('fs');
const path = require('path');

const LINE = /^\[(\d+):(\d{2})(?::(\d{2}))?\]\s*(.*)$/;
const TS = '((?:\\d{1,2}:)?\\d{1,2}:\\d{2})';
const DESC_START = new RegExp(`^[\\s\\-–—•*\\[(]*${TS}[\\])]*\\s*(?:[|\\-–—:.]\\s*)?(.*)$`);
const DESC_END = new RegExp(`^(.*?)[\\s\\-–—|:(\\[]*${TS}[\\])]*$`);

function toSeconds(ts) {
  return String(ts).split(':').reduce((s, p) => {
    if (!/^\s*\d+\s*$/.test(p)) throw new Error(`bad timestamp ${ts}`);
    return s * 60 + parseInt(p, 10);
  }, 0);
}

function fmt(sec) {
  sec = Math.trunc(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

const words = t => t.split(/\s+/).filter(Boolean).length;

function readLines(file) {
  const out = [];
  for (let raw of fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const m = raw.match(LINE);
    if (m) {
      const [, a, b, c, text] = m;
      const sec = c !== undefined ? +a * 3600 + +b * 60 + +c : +a * 60 + +b;
      out.push([sec, text]);
    } else if (out.length) {
      out[out.length - 1][1] += ' ' + raw.trim();
    } else {
      out.push([0, raw.trim()]);
    }
  }
  return out;
}

// Chapters written in a video description: the first run that starts at 0:00 and keeps going up, 3 or more entries.
function chaptersFromDescription(desc) {
  const found = [];
  for (const raw of String(desc || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let m = line.match(DESC_START), ts, title;
    if (m) { ts = m[1]; title = m[2]; }
    else if ((m = line.match(DESC_END)) && m[1].trim()) { ts = m[2]; title = m[1]; }
    else continue;
    let start;
    try { start = toSeconds(ts); } catch (e) { continue; }
    title = title.replace(/^[\s|\-–—:.]+|[\s|\-–—:.]+$/g, '').trim();
    found.push([start, title || fmt(start)]);
  }
  const first = found.findIndex(c => c[0] === 0);
  if (first < 0) return [];
  const run = [found[first]];
  for (const c of found.slice(first + 1)) {
    if (c[0] <= run[run.length - 1][0]) break;
    run.push(c);
  }
  return run.length >= 3 ? run : [];
}

// Split lines in [start, end) into ~target-second pieces at line boundaries.
function windows(lines, start, end, target) {
  const sel = lines.filter(l => start <= l[0] && l[0] < end);
  const pieces = [];
  let cur = [], curStart = start;
  for (const l of sel) {
    if (cur.length && l[0] - curStart >= target) {
      pieces.push([curStart, l[0], cur]);
      cur = []; curStart = l[0];
    }
    cur.push(l);
  }
  if (cur.length) pieces.push([curStart, end, cur]);
  // merge a tiny tail (< 1/3 target) into the previous piece
  if (pieces.length > 1) {
    const [a, b] = pieces.slice(-2);
    if (b[1] - b[0] < target / 3) pieces.splice(-2, 2, [a[0], b[1], a[2].concat(b[2])]);
  }
  return pieces;
}

function parseArgs(argv) {
  const a = { out: 'chunks', minMinutes: 60, minWords: 12000, targetMinutes: 15, force: false, rest: [] };
  const num = (k, v) => { const n = Number(v); if (!isFinite(n)) { console.error(`bad value for ${k}: ${v}`); process.exit(2); } return n; };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--meta') a.meta = argv[++i];
    else if (k === '--out') a.out = argv[++i];
    else if (k === '--min-minutes') a.minMinutes = num(k, argv[++i]);
    else if (k === '--min-words') a.minWords = Math.trunc(num(k, argv[++i]));
    else if (k === '--target-minutes') a.targetMinutes = num(k, argv[++i]);
    else if (k === '--force') a.force = true;
    else a.rest.push(k);
  }
  a.transcript = a.rest[0];
  if (!a.transcript) {
    console.error('Usage: node chunk_transcript.js transcript.txt [--meta transcript.meta.json] [--out chunks] [--force]');
    process.exit(2);
  }
  return a;
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(a.transcript)) { console.log(`NO_TRANSCRIPT: ${a.transcript} not found. Get the captions first (Step 1).`); process.exit(1); }
  const lines = readLines(a.transcript);
  if (!lines.length) { console.log('EMPTY_TRANSCRIPT'); process.exit(1); }
  let meta = {};
  if (a.meta && fs.existsSync(a.meta)) meta = JSON.parse(fs.readFileSync(a.meta, 'utf8').replace(/^\uFEFF/, ''));

  const totalWords = lines.reduce((s, [, t]) => s + words(t), 0);
  const duration = Math.trunc(Number(meta.duration_seconds || meta.lengthSeconds || 0)) || lines[lines.length - 1][0] + 30;
  const minutes = duration / 60;
  if (!a.force && minutes < a.minMinutes && totalWords < a.minWords) {
    console.log(`MODE=single DURATION=${fmt(duration)} WORDS=${totalWords} (below ${a.minMinutes} min and ${a.minWords} words)`);
    return;
  }

  const target = a.targetMinutes * 60;
  let chapters = [], chapterSource = 'chapters';
  for (const c of meta.chapters || []) {
    try { if (c && c.start !== undefined) chapters.push([toSeconds(c.start), c.title || '']); } catch (e) { /* skip bad entries */ }
  }
  if (chapters.length < 2) {
    chapters = chaptersFromDescription(meta.description || meta.descriptionStart);
    chapterSource = 'description chapters';
  }
  chapters.sort((x, y) => x[0] - y[0] || (x[1] < y[1] ? -1 : x[1] > y[1] ? 1 : 0));

  const chunks = []; // [start, end, title, lines]
  let source;
  if (chapters.length >= 2) {
    const bounds = chapters.map(([s, t], i) => [s, i + 1 < chapters.length ? chapters[i + 1][0] : duration, t]);
    if (bounds[0][0] > 0) bounds.unshift([0, bounds[0][0], 'Opening']);
    // merge short chapters (< 40% of target) forward, split long ones (> 2x target)
    const merged = [];
    for (const [s, e, t] of bounds) {
      const last = merged[merged.length - 1];
      if (last && last[1] - last[0] < 0.4 * target) merged[merged.length - 1] = [last[0], e, `${last[2]} + ${t}`];
      else merged.push([s, e, t]);
    }
    for (const [s, e, t] of merged) {
      if (e - s > 2 * target) {
        const parts = windows(lines, s, e, target);
        parts.forEach(([ps, pe, pl], i) => chunks.push([ps, pe, `${t} (part ${i + 1}/${parts.length})`, pl]));
      } else {
        chunks.push([s, e, t, lines.filter(l => s <= l[0] && l[0] < e)]);
      }
    }
    source = chapterSource;
  } else {
    for (const [ps, pe, pl] of windows(lines, 0, duration, target)) chunks.push([ps, pe, `${fmt(ps)}–${fmt(pe)}`, pl]);
    source = 'time windows';
  }

  const kept = chunks.filter(c => c[3].length);
  fs.mkdirSync(a.out, { recursive: true });
  const index = kept.map(([s, e, t, pl], i) => {
    const id = `chunk-${String(i + 1).padStart(2, '0')}`;
    const file = path.join(a.out, id + '.txt');
    fs.writeFileSync(file, `# ${id} | ${fmt(s)}-${fmt(e)} | ${t}\n` + pl.map(([sec, text]) => `[${fmt(sec)}] ${text}\n`).join(''), 'utf8');
    return { id, file, start: s, end: e, start_ts: fmt(s), end_ts: fmt(e), title: t, words: pl.reduce((n, [, x]) => n + words(x), 0) };
  });
  fs.writeFileSync(path.join(a.out, 'index.json'),
    JSON.stringify({ duration_seconds: duration, words: totalWords, split_by: source, chunks: index }, null, 2), 'utf8');

  console.log(`MODE=chunked DURATION=${fmt(duration)} WORDS=${totalWords} CHUNKS=${index.length} SPLIT_BY=${source}`);
  for (const c of index) {
    console.log(`  ${c.id}  ${c.start_ts.padStart(8)}-${c.end_ts.padEnd(8)} ${String(c.words).padStart(6)} words  ${c.title}`);
  }
}

if (require.main === module) main();
else module.exports = { chaptersFromDescription, readLines, windows };
