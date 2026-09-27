// Combine part summaries (see references/summary-schema.md) into one ranked summary.
//
// VIDEO mode: chunks of one long video -> merged.json + coverage.svg
//   node merge_summaries.js video <dir with chunk-*.json> [--index chunks/index.json]
//                                 [--points 10] [--out merged.json] [--svg coverage.svg]
//   * removes near-duplicate points, keeps the best of each
//   * guarantees coverage: every non-filler chunk with a useful point keeps its best point
//   * fills the remaining point budget by importance across the WHOLE video (not by position)
//   * adds "reserve": the next best points, to swap in when two kept points say the same thing in other words
//   * writes a coverage timeline SVG: covered / thin / filler segments across the video's length
//
// PLAYLIST mode: one summary JSON per video -> overview.json + matrix.html
//   node merge_summaries.js playlist <file, dir or pattern> [...] [--playlist playlist.json] [--points 12]
//                                    [--out overview.json] [--matrix matrix.html] [--max-concepts 18]
//   * per-video stats, total duration, top points across all videos
//   * concept x video matrix (which video covers which concept; shared concepts first)
//   * patterns like yt-notes-work/*/summary.json are expanded here, so it works in any shell
//   * --playlist (the list_playlist output): keeps only that playlist's videos, in playlist order, numbered as in
//     the playlist, so summaries left over from other runs don't leak in and "#3" means the playlist's 3rd video
//
// Node.js only, no packages. Prints a short report; warnings start with an UPPERCASE code.
const fs = require('fs');
const path = require('path');

// ---------- text similarity (a port of Python's difflib.SequenceMatcher.ratio, same results) ----------
function seqRatio(a, b) {
  const la = a.length, lb = b.length;
  if (!la && !lb) return 1;
  const b2j = new Map();
  for (let j = 0; j < lb; j++) {
    const c = b[j];
    if (!b2j.has(c)) b2j.set(c, []);
    b2j.get(c).push(j);
  }
  if (lb >= 200) { // difflib's "autojunk": very common characters are not used to start a match
    const ntest = Math.floor(lb / 100) + 1;
    for (const [c, idx] of [...b2j]) if (idx.length > ntest) b2j.delete(c);
  }
  const longest = (alo, ahi, blo, bhi) => {
    let besti = alo, bestj = blo, bestsize = 0, j2len = new Map();
    for (let i = alo; i < ahi; i++) {
      const next = new Map();
      for (const j of b2j.get(a[i]) || []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) || 0) + 1;
        next.set(j, k);
        if (k > bestsize) { besti = i - k + 1; bestj = j - k + 1; bestsize = k; }
      }
      j2len = next;
    }
    while (besti > alo && bestj > blo && a[besti - 1] === b[bestj - 1]) { besti--; bestj--; bestsize++; }
    while (besti + bestsize < ahi && bestj + bestsize < bhi && a[besti + bestsize] === b[bestj + bestsize]) bestsize++;
    return [besti, bestj, bestsize];
  };
  let matches = 0;
  const queue = [[0, la, 0, lb]];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop();
    const [i, j, k] = longest(alo, ahi, blo, bhi);
    if (k) {
      matches += k;
      if (alo < i && blo < j) queue.push([alo, i, blo, j]);
      if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
    }
  }
  return (2 * matches) / (la + lb);
}

const norm = s => (String(s ?? '').toLowerCase().match(/[a-z0-9]+/g) || []).join(' ');

// Near-duplicate test that is word-based and number-aware ("Step 1" is not "Step 2").
function similar(a, b, cutoff = 0.78) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = new Set(na.split(' ')), tb = new Set(nb.split(' '));
  const digits = s => [...s].filter(w => /^\d+$/.test(w)).sort().join(' ');
  if (digits(ta) !== digits(tb)) return false;
  const [short, long] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  if (short.size >= 3 && [...short].every(w => long.has(w))) return true;
  const inter = [...ta].filter(w => tb.has(w)).length;
  const jaccard = inter / new Set([...ta, ...tb]).size;
  return jaccard >= 0.67 && seqRatio(na, nb) >= cutoff;
}

// ---------- helpers ----------
function fmt(sec) {
  sec = Math.trunc(Number(sec) || 0);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const num = v => Number(v) || 0;
// Python's round(x, 2): exact halves go to the even digit (3.125 -> 3.12), so results match the Python version.
const round2 = x => { const s = x * 100, f = Math.floor(s); return (s - f === 0.5 ? (f % 2 ? f + 1 : f) : Math.round(s)) / 100; };
const pyFloat = x => (Number.isInteger(x) ? x.toFixed(1) : String(x));
const imp = x => num(x.importance);
const tOf = x => num(x.t);
// Compare score arrays like Python tuples; sorting "high first" keeps the original order for ties.
const cmpTuple = (x, y) => { for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; return 0; };
const sortDesc = (items, score) => items.slice().sort((p, q) => cmpTuple(score(q), score(p)));
const maxBy = (items, score) => items.reduce((best, it) => (best === null || cmpTuple(score(it), score(best)) > 0 ? it : best), null);
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));

// Expand * and ? in a path pattern without relying on the shell (PowerShell and cmd don't expand them).
function expand(pattern) {
  if (!/[*?]/.test(pattern)) return [pattern];
  const parts = pattern.split(/[\\/]+/);
  let bases = [path.isAbsolute(pattern) ? parts.shift() + path.sep : '.'];
  if (/^[A-Za-z]:$/.test(parts[0] || '') && !path.isAbsolute(pattern)) bases = [parts.shift() + path.sep];
  for (const seg of parts) {
    if (!/[*?]/.test(seg)) { bases = bases.map(b => path.join(b, seg)).filter(p => fs.existsSync(p)); continue; }
    const re = new RegExp('^' + seg.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    bases = bases.flatMap(b => {
      try {
        return fs.readdirSync(b).filter(n => re.test(n) && (seg.startsWith('.') || !n.startsWith('.')))
          .sort().map(n => path.join(b, n));
      } catch (e) { return []; }
    });
  }
  return bases.map(p => (pattern.startsWith('./') || path.isAbsolute(pattern) ? p : path.relative('.', p) || p));
}

function loadParts(paths) {
  let files = [];
  for (const pat of paths) {
    const hits = expand(pat);
    if (!hits.length) console.log(`NO_MATCH ${pat}`);
    for (const p of hits) {
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
        files = files.concat(fs.readdirSync(p).filter(n => n.endsWith('.json') && !n.startsWith('.')).map(n => path.join(p, n)).sort());
      } else files.push(p);
    }
  }
  const parts = [];
  for (const f of files) {
    const base = path.basename(f);
    if (['index.json', 'merged.json', 'overview.json', 'playlist.json'].includes(base) || base.endsWith('.meta.json')) continue;
    let d;
    try { d = readJson(f); } catch (e) { console.log(`BAD_JSON ${f}: ${e.message}`); continue; }
    if (!d || typeof d !== 'object' || Array.isArray(d) || !('points' in d)) {
      console.log(`SKIPPED ${f}: not a summary file (no 'points')`);
      continue;
    }
    d.source = d.source || {};
    d._file = f;
    parts.push(d);
  }
  return parts;
}

// Keep one item per near-duplicate group; the highest score wins, extra timestamps are kept in 'also_at'.
function dedupe(items, key, score) {
  const kept = [];
  for (const it of sortDesc(items, score)) {
    const hit = kept.find(k => similar(it[key] ?? '', k[key] ?? ''));
    if (hit) { if ('t' in it) (hit.also_at = hit.also_at || []).push(it.t); }
    else kept.push({ ...it });
  }
  return kept;
}

// ---------- video mode ----------
function mergeVideo(a) {
  const parts = loadParts([a.dir]);
  if (!parts.length) { console.log('NO_PARTS: no chunk JSON files found'); process.exit(1); }
  let index = {}, duration = null;
  if (a.index && fs.existsSync(a.index)) {
    const idx = readJson(a.index);
    for (const c of idx.chunks || []) index[c.id] = c;
    duration = idx.duration_seconds;
  }
  const partId = p => p.source.part || path.basename(p._file, path.extname(p._file));
  const startOf = p => (p.source.start !== undefined && p.source.start !== null ? p.source.start : (index[partId(p)] || {}).start || 0);
  parts.sort((x, y) => startOf(x) - startOf(y));

  const score = x => [imp(x), -tOf(x)];
  let allPoints = [];
  const must = [];
  for (const p of parts) {
    const pid = partId(p);
    const pts = (p.points || []).filter(x => x && x.point).map(x => ({ ...x, part: pid }));
    allPoints = allPoints.concat(pts);
    const best = maxBy(pts, score);
    // coverage guarantee only for chunks with a genuinely useful point (importance >= 3);
    // weaker chunks show up as "thin" on the timeline instead of pushing out better points
    if (!p.filler && best && imp(best) >= 3) must.push(best);
  }

  const points = dedupe(allPoints, 'point', score);
  const keep = [];
  for (const m of must) {
    const match = points.find(p => similar(p.point, m.point));
    if (match && !keep.includes(match)) keep.push(match);
  }
  const budget = Math.max(a.points, keep.length);
  if (keep.length > a.points) {
    console.log(`COVERAGE_OVER_BUDGET: ${keep.length} content chunks need a point each; budget raised from ${a.points} to ${budget}. ` +
      'Consider a chapter-grouped main-points table.');
  }
  for (const p of sortDesc(points, score)) {
    if (keep.length >= budget) break;
    if (!keep.includes(p)) keep.push(p);
  }
  keep.sort((x, y) => tOf(x) - tOf(y));
  // The next best points, so the writer can swap in a concrete point where two kept points say the same thing
  // in different words (the word-based de-dup can't see that).
  const reserve = sortDesc(points, score).filter(p => !keep.includes(p)).slice(0, budget);

  const keptByPart = {};
  for (const p of keep) keptByPart[p.part] = (keptByPart[p.part] || 0) + 1;
  const coverage = parts.map(p => {
    const pid = partId(p), src = p.source, ix = index[pid] || {};
    const start = src.start !== undefined ? src.start : (ix.start !== undefined ? ix.start : 0);
    const end = src.end !== undefined ? src.end : (ix.end !== undefined ? ix.end : start);
    const status = p.filler ? 'filler' : (keptByPart[pid] ? 'covered' : 'thin');
    return { part: pid, title: src.part_title || ix.title || '', start, end, status, kept_points: keptByPart[pid] || 0,
      points_available: (p.points || []).filter(x => imp(x) >= 3).length, filler_reason: p.filler_reason || '' };
  });
  duration = duration || Math.max(0, ...coverage.map(c => num(c.end))) || 1;

  const collect = (field, key) => {
    const items = parts.flatMap(p => (p[field] || []).map(x => ({ ...x, part: partId(p) })));
    return key ? dedupe(items, key, score) : items;
  };
  const first = parts[0].source;
  const srcKeys = ['video_id', 'title', 'channel', 'url', 'published', 'caption_type'];
  const merged = {
    source: Object.fromEntries(srcKeys.map(k => [k, first[k] ?? null])),
    duration_seconds: duration,
    one_sentence_per_part: parts.map(p => ({ part: partId(p), one_sentence: p.one_sentence || '' })),
    points: keep,
    reserve,
    concepts: collect('concepts', 'term'),
    claims: collect('claims', 'claim'),
    numbers: collect('numbers', 'context'),
    frameworks: collect('frameworks', 'name'),
    visual_candidates: collect('visual_candidates', 'idea'),
    memorise: dedupe(parts.flatMap(p => (p.memorise || []).map(m => ({ m }))), 'm', () => [0]).map(x => x.m),
    watch_worthy: collect('watch_worthy', null).sort((x, y) => tOf(x) - tOf(y)),
    coverage,
  };
  writeJson(a.out, merged);
  fs.writeFileSync(a.svg, coverageSvg(coverage, duration), 'utf8');

  const n = s => coverage.filter(c => c.status === s).length;
  console.log(`OK ${a.out} POINTS=${keep.length} (from ${allPoints.length}, ${points.length} after de-dup) ` +
    `PARTS=${parts.length} COVERED=${n('covered')} THIN=${n('thin')} FILLER=${n('filler')}  SVG=${a.svg}`);
  for (const c of coverage) {
    console.log(`  ${c.part} ${fmt(c.start).padStart(8)}-${fmt(c.end).padEnd(8)} ${c.status.padEnd(7)} kept=${c.kept_points} ${String(c.title).slice(0, 50)}`);
  }
  if (n('thin')) {
    console.log('THIN_PARTS: some chunks had only minor points, so none were used. Mention them in one line ("also covered: ...") or mark them filler if that is what they are.');
  }
}

function coverageSvg(coverage, duration) {
  const W = 640, x0 = 20, x1 = 620, span = x1 - x0;
  const colors = { covered: '#1f4e8c', thin: '#a15c00', filler: '#d5dce6' };
  const out = [`<svg viewBox="0 0 ${W} 118" role="img" aria-label="Coverage timeline" xmlns="http://www.w3.org/2000/svg">`,
    '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<rect width="6" height="6" fill="#eef1f5"/><line x1="0" y1="0" x2="0" y2="6" stroke="#c3ccd8" stroke-width="3"/></pattern></defs>'];
  for (const c of coverage) {
    const xa = x0 + span * c.start / duration, xb = x0 + span * c.end / duration;
    const fill = c.status === 'filler' ? 'url(#hatch)' : colors[c.status];
    out.push(`<rect x="${xa.toFixed(1)}" y="22" width="${Math.max(xb - xa - 1.5, 1).toFixed(1)}" height="30" rx="3" fill="${fill}">` +
      `<title>${esc(c.title)}</title></rect>`);
    if (xb - xa > 26 && c.status !== 'filler') {
      out.push(`<text x="${((xa + xb) / 2).toFixed(1)}" y="41" text-anchor="middle" font-size="10" fill="#fff" font-weight="bold">${c.kept_points}</text>`);
    }
  }
  // ticks every 15 or 30 minutes
  const step = duration <= 3 * 3600 ? 900 : 1800;
  for (let t = 0; t <= duration; t += step) {
    const x = x0 + span * t / duration;
    out.push(`<line x1="${x.toFixed(1)}" y1="54" x2="${x.toFixed(1)}" y2="60" stroke="#5b6675"/>`);
    out.push(`<text x="${x.toFixed(1)}" y="72" text-anchor="middle" font-size="10" fill="#5b6675">${fmt(t)}</text>`);
  }
  const legend = [['covered', 'Covered (number = points used)'], ['thin', 'Only minor points, none used'], ['filler', 'Filler (sponsor, intro, breaks)']];
  let lx = x0;
  for (const [key, label] of legend) {
    const fill = key === 'filler' ? 'url(#hatch)' : colors[key];
    out.push(`<rect x="${lx}" y="90" width="14" height="12" rx="2" fill="${fill}"/>`);
    out.push(`<text x="${lx + 19}" y="100" font-size="10.5" fill="#1b2430">${label}</text>`);
    lx += 205;
  }
  out.push(`<text x="${x0}" y="14" font-size="10.5" fill="#5b6675">Video timeline, ${fmt(duration)} total</text>`);
  out.push('</svg>');
  return out.join('\n');
}

// ---------- playlist mode ----------
function mergePlaylist(a) {
  let vids = loadParts(a.paths), order = null;
  if (a.playlist) {
    const pl = readJson(a.playlist);
    order = new Map((pl.videos || []).map((v, i) => [v.id, Number(v.n) || i + 1]));
    const found = vids.length;
    vids = vids.filter(v => order.has(v.source.video_id));
    if (vids.length < found) console.log(`OTHER_SUMMARIES: ${found - vids.length} summary file(s) are not in this playlist and were left out.`);
    vids.sort((x, y) => order.get(x.source.video_id) - order.get(y.source.video_id));
  }
  if (!vids.length) { console.log('NO_PARTS: no video summary JSON files found'); process.exit(1); }
  const numOf = (v, i) => (order ? order.get(v.source.video_id) : i + 1);
  let total = 0, allPoints = [];
  const videos = vids.map((v, i) => {
    const s = v.source, dur = Math.trunc(num(s.duration_seconds || v.duration_seconds));
    total += dur;
    const pts = v.points || [];
    const imps = pts.map(imp);
    allPoints = allPoints.concat(pts.map(p => ({ ...p, video: numOf(v, i) })));
    return { n: numOf(v, i), video_id: s.video_id ?? null, title: s.title ?? null, channel: s.channel ?? null, url: s.url ?? null,
      duration_seconds: dur, one_sentence: v.one_sentence || '', points: pts.length,
      core_points: imps.filter(x => x >= 4).length,
      avg_importance: imps.length ? round2(imps.reduce((x, y) => x + y, 0) / imps.length) : 0 };
  });

  const score = x => [imp(x), -num(x.video)];
  const top = sortDesc(dedupe(allPoints, 'point', score), score).slice(0, a.points);

  // concept x video matrix
  const concepts = [];
  vids.forEach((v, i) => {
    for (const c of v.concepts || []) {
      const term = String(c.term || '').trim();
      if (!term) continue;
      const hit = concepts.find(k => similar(k.term, term, 0.85));
      if (hit) hit.videos.add(numOf(v, i));
      else concepts.push({ term, explanation: c.explanation || '', videos: new Set([numOf(v, i)]) });
    }
  });
  concepts.sort((x, y) => (y.videos.size - x.videos.size) || (Math.min(...x.videos) - Math.min(...y.videos)) ||
    (x.term.toLowerCase() < y.term.toLowerCase() ? -1 : x.term.toLowerCase() > y.term.toLowerCase() ? 1 : 0));
  for (const k of concepts) k.videos = [...k.videos].sort((x, y) => x - y);

  const overview = { videos, total_duration_seconds: total, top_points: top, concepts,
    shared_concepts: concepts.filter(k => k.videos.length > 1).map(k => k.term) };
  writeJson(a.out, overview);
  fs.writeFileSync(a.matrix, matrixHtml(concepts, videos, a.maxConcepts), 'utf8');
  console.log(`OK ${a.out} VIDEOS=${videos.length} TOTAL=${fmt(total)} TOP_POINTS=${top.length} ` +
    `CONCEPTS=${concepts.length} SHARED=${overview.shared_concepts.length} MATRIX=${a.matrix}`);
  for (const v of videos) {
    console.log(`  #${v.n} ${fmt(v.duration_seconds).padStart(8)} core=${v.core_points} avg=${v.points ? pyFloat(v.avg_importance) : 0} ${String(v.title).slice(0, 60)}`);
  }
}

function matrixHtml(concepts, videos, limit) {
  const rows = concepts.slice(0, limit);
  const w = Math.max(5, Math.floor(60 / Math.max(videos.length, 1)));
  const head = videos.map(v => `<th style="text-align:center;width:${w}%">#${v.n}</th>`).join('');
  const out = [`<table class="matrix"><tr><th>Concept</th>${head}<th style="width:7%;text-align:center">Videos</th></tr>`];
  for (const k of rows) {
    const cells = videos.map(v => (k.videos.includes(v.n)
      ? '<td style="text-align:center;color:#1f4e8c;font-size:11pt">●</td>'
      : '<td style="text-align:center;color:#d5dce6">·</td>')).join('');
    out.push(`<tr><td>${esc(k.term)}</td>${cells}<td style="text-align:center"><b>${k.videos.length}</b></td></tr>`);
  }
  out.push('</table>');
  if (concepts.length > limit) out.push(`<p class="muted small">Showing the ${limit} most shared of ${concepts.length} concepts.</p>`);
  return out.join('\n');
}

// ---------- command line ----------
function main() {
  const [mode, ...rest] = process.argv.slice(2);
  const usage = 'Usage: node merge_summaries.js video <dir> [--index F] [--points N] [--out F] [--svg F]\n' +
    '       node merge_summaries.js playlist <file|dir|pattern>... [--playlist F] [--points N] [--out F] [--matrix F] [--max-concepts N]';
  if (mode !== 'video' && mode !== 'playlist') { console.error(usage); process.exit(2); }
  const a = mode === 'video'
    ? { points: 10, out: 'merged.json', svg: 'coverage.svg', index: null }
    : { points: 12, out: 'overview.json', matrix: 'matrix.html', maxConcepts: 18 };
  const pos = [];
  for (let i = 0; i < rest.length; i++) {
    const k = rest[i], v = rest[i + 1];
    if (k === '--points') { a.points = parseInt(v, 10); i++; }
    else if (k === '--out') { a.out = v; i++; }
    else if (k === '--svg') { a.svg = v; i++; }
    else if (k === '--index') { a.index = v; i++; }
    else if (k === '--matrix') { a.matrix = v; i++; }
    else if (k === '--max-concepts') { a.maxConcepts = parseInt(v, 10); i++; }
    else if (k === '--playlist') { a.playlist = v; i++; }
    else pos.push(k);
  }
  if (!pos.length || !Number.isFinite(a.points)) { console.error(usage); process.exit(2); }
  if (mode === 'video') { a.dir = pos[0]; mergeVideo(a); } else { a.paths = pos; mergePlaylist(a); }
}

if (require.main === module) main();
else module.exports = { similar, seqRatio, expand };
