"""Combine part summaries (see references/summary-schema.md) into one ranked summary.

VIDEO mode: chunks of one long video -> merged.json + coverage.svg
  python merge_summaries.py video <dir with chunk-*.json> [--index chunks/index.json]
                                  [--points 10] [--out merged.json] [--svg coverage.svg]
  * removes near-duplicate points, keeps the best of each
  * guarantees coverage: every non-filler chunk keeps at least its best point
  * fills the remaining point budget by importance across the WHOLE video (not by position)
  * writes a coverage timeline SVG: covered / thin / filler segments across the video's length

PLAYLIST mode: one summary JSON per video -> overview.json + matrix.html
  python merge_summaries.py playlist <file-or-dir> [<file-or-dir> ...] [--points 12] [--out overview.json]
                                     [--matrix matrix.html]
  * per-video stats, total duration, top points across all videos
  * concept x video matrix (which video covers which concept; shared concepts first)

Standard library only. Prints a short report; warnings start with an UPPERCASE code.
"""
import argparse
import difflib
import glob
import html
import json
import os
import re
import sys

WORD = re.compile(r"[a-z0-9]+")


def norm(s):
    return " ".join(WORD.findall(str(s).lower()))


def similar(a, b, cutoff=0.78):
    """Near-duplicate test that is word-based and number-aware ("Step 1" is not "Step 2")."""
    na, nb = norm(a), norm(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    ta, tb = set(na.split()), set(nb.split())
    if {w for w in ta if w.isdigit()} != {w for w in tb if w.isdigit()}:
        return False
    short, long_ = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    if len(short) >= 3 and short <= long_:
        return True
    jaccard = len(ta & tb) / len(ta | tb)
    return jaccard >= 0.67 and difflib.SequenceMatcher(None, na, nb).ratio() >= cutoff


def fmt(sec):
    sec = int(sec or 0)
    h, m, s = sec // 3600, (sec % 3600) // 60, sec % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def load_parts(paths):
    files = []
    for p in paths:
        if os.path.isdir(p):
            files += sorted(glob.glob(os.path.join(p, "*.json")))
        else:
            files.append(p)
    parts = []
    for f in files:
        base = os.path.basename(f)
        if base in ("index.json", "merged.json", "overview.json", "playlist.json") or base.endswith(".meta.json"):
            continue
        try:
            with open(f, encoding="utf-8") as fh:
                d = json.load(fh)
        except (OSError, json.JSONDecodeError) as e:
            print(f"BAD_JSON {f}: {e}")
            continue
        if not isinstance(d, dict) or "points" not in d:
            print(f"SKIPPED {f}: not a summary file (no 'points')")
            continue
        d.setdefault("source", {})
        d["_file"] = f
        parts.append(d)
    return parts


def dedupe(items, key, score):
    """Keep one item per near-duplicate group; the highest score wins, extra timestamps are kept in 'also_at'."""
    kept = []
    for it in sorted(items, key=score, reverse=True):
        for k in kept:
            if similar(it.get(key, ""), k.get(key, "")):
                if "t" in it:
                    k.setdefault("also_at", []).append(it["t"])
                break
        else:
            kept.append(dict(it))
    return kept


def merge_video(a):
    parts = load_parts([a.dir])
    if not parts:
        print("NO_PARTS: no chunk JSON files found")
        sys.exit(1)
    index = {}
    if a.index and os.path.exists(a.index):
        with open(a.index, encoding="utf-8") as f:
            idx = json.load(f)
        index = {c["id"]: c for c in idx.get("chunks", [])}
        duration = idx.get("duration_seconds")
    else:
        duration = None

    def part_id(p):
        return p["source"].get("part") or os.path.splitext(os.path.basename(p["_file"]))[0]

    parts.sort(key=lambda p: (p["source"].get("start") if p["source"].get("start") is not None else index.get(part_id(p), {}).get("start", 0)))
    all_points, must = [], []
    for p in parts:
        pid = part_id(p)
        pts = [dict(x, part=pid) for x in p.get("points", []) if x.get("point")]
        all_points += pts
        best = max(pts, key=lambda x: (x.get("importance", 0), -x.get("t", 0))) if pts else None
        # coverage guarantee only for chunks with a genuinely useful point (importance >= 3);
        # weaker chunks show up as "thin" on the timeline instead of pushing out better points
        if not p.get("filler") and best and best.get("importance", 0) >= 3:
            must.append(best)

    points = dedupe(all_points, "point", lambda x: (x.get("importance", 0), -x.get("t", 0)))
    # coverage guarantee: map each chunk's best point to its surviving (deduped) version
    keep = []
    for m in must:
        match = next((p for p in points if similar(p["point"], m["point"])), None)
        if match and match not in keep:
            keep.append(match)
    budget = max(a.points, len(keep))
    if len(keep) > a.points:
        print(f"COVERAGE_OVER_BUDGET: {len(keep)} content chunks need a point each; budget raised from {a.points} to {budget}. "
              "Consider a chapter-grouped main-points table.")
    for p in sorted(points, key=lambda x: (x.get("importance", 0), -x.get("t", 0)), reverse=True):
        if len(keep) >= budget:
            break
        if p not in keep:
            keep.append(p)
    keep.sort(key=lambda x: x.get("t", 0))

    kept_by_part = {}
    for p in keep:
        kept_by_part[p["part"]] = kept_by_part.get(p["part"], 0) + 1
    coverage = []
    for p in parts:
        pid = part_id(p)
        src, ix = p["source"], index.get(pid, {})
        start = src.get("start", ix.get("start", 0))
        end = src.get("end", ix.get("end", start))
        n_avail = len([x for x in p.get("points", []) if x.get("importance", 0) >= 3])
        status = "filler" if p.get("filler") else ("covered" if kept_by_part.get(pid) else "thin")
        coverage.append({"part": pid, "title": src.get("part_title") or ix.get("title", ""), "start": start, "end": end,
                         "status": status, "kept_points": kept_by_part.get(pid, 0), "points_available": n_avail,
                         "filler_reason": p.get("filler_reason", "")})
    duration = duration or max((c["end"] for c in coverage), default=0) or 1

    def collect(field, key):
        items = [dict(x, part=part_id(p)) for p in parts for x in p.get(field, [])]
        return dedupe(items, key, lambda x: (x.get("importance", 0), -x.get("t", 0))) if key else items

    first = parts[0]["source"]
    merged = {
        "source": {k: first.get(k) for k in ("video_id", "title", "channel", "url", "published", "caption_type")},
        "duration_seconds": duration,
        "one_sentence_per_part": [{"part": part_id(p), "one_sentence": p.get("one_sentence", "")} for p in parts],
        "points": keep,
        "concepts": collect("concepts", "term"),
        "claims": collect("claims", "claim"),
        "numbers": collect("numbers", "context"),
        "frameworks": collect("frameworks", "name"),
        "visual_candidates": collect("visual_candidates", "idea"),
        "memorise": dedupe([{"m": m} for p in parts for m in p.get("memorise", [])], "m", lambda x: 0),
        "watch_worthy": sorted(collect("watch_worthy", None), key=lambda x: x.get("t", 0)),
        "coverage": coverage,
    }
    merged["memorise"] = [x["m"] for x in merged["memorise"]]
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
    with open(a.svg, "w", encoding="utf-8") as f:
        f.write(coverage_svg(coverage, duration))

    n = {s: sum(1 for c in coverage if c["status"] == s) for s in ("covered", "thin", "filler")}
    print(f"OK {a.out} POINTS={len(keep)} (from {len(all_points)}, {len(points)} after de-dup) "
          f"PARTS={len(parts)} COVERED={n['covered']} THIN={n['thin']} FILLER={n['filler']}  SVG={a.svg}")
    for c in coverage:
        print(f"  {c['part']} {fmt(c['start']):>8}-{fmt(c['end']):<8} {c['status']:<7} kept={c['kept_points']} {c['title'][:50]}")
    if n["thin"]:
        print("THIN_PARTS: some chunks had only minor points, so none were used. Mention them in one line (\"also covered: ...\") or mark them filler if that is what they are.")


def coverage_svg(coverage, duration):
    W, x0, x1 = 640, 20, 620
    span = x1 - x0
    colors = {"covered": "#1f4e8c", "thin": "#a15c00", "filler": "#d5dce6"}
    out = [f'<svg viewBox="0 0 {W} 118" role="img" aria-label="Coverage timeline" xmlns="http://www.w3.org/2000/svg">',
           '<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
           '<rect width="6" height="6" fill="#eef1f5"/><line x1="0" y1="0" x2="0" y2="6" stroke="#c3ccd8" stroke-width="3"/></pattern></defs>']
    for i, c in enumerate(coverage):
        xa = x0 + span * c["start"] / duration
        xb = x0 + span * c["end"] / duration
        fill = "url(#hatch)" if c["status"] == "filler" else colors[c["status"]]
        out.append(f'<rect x="{xa:.1f}" y="22" width="{max(xb - xa - 1.5, 1):.1f}" height="30" rx="3" fill="{fill}">'
                   f'<title>{html.escape(c["title"])}</title></rect>')
        if xb - xa > 26 and c["status"] != "filler":
            out.append(f'<text x="{(xa + xb) / 2:.1f}" y="41" text-anchor="middle" font-size="10" fill="#fff" font-weight="bold">{c["kept_points"]}</text>')
    # ticks every 15 or 30 minutes
    step = 900 if duration <= 3 * 3600 else 1800
    t = 0
    while t <= duration:
        x = x0 + span * t / duration
        out.append(f'<line x1="{x:.1f}" y1="54" x2="{x:.1f}" y2="60" stroke="#5b6675"/>')
        out.append(f'<text x="{x:.1f}" y="72" text-anchor="middle" font-size="10" fill="#5b6675">{fmt(t)}</text>')
        t += step
    legend = [("covered", "Covered (number = points used)"), ("thin", "Only minor points, none used"), ("filler", "Filler (sponsor, intro, breaks)")]
    lx = x0
    for key, label in legend:
        fill = "url(#hatch)" if key == "filler" else colors[key]
        out.append(f'<rect x="{lx}" y="90" width="14" height="12" rx="2" fill="{fill}"/>')
        out.append(f'<text x="{lx + 19}" y="100" font-size="10.5" fill="#1b2430">{label}</text>')
        lx += 205
    out.append(f'<text x="{x0}" y="14" font-size="10.5" fill="#5b6675">Video timeline, {fmt(duration)} total</text>')
    out.append("</svg>")
    return "\n".join(out)


def merge_playlist(a):
    vids = load_parts(a.paths)
    if not vids:
        print("NO_PARTS: no video summary JSON files found")
        sys.exit(1)
    total = 0
    videos, all_points = [], []
    for i, v in enumerate(vids, 1):
        s = v["source"]
        dur = int(s.get("duration_seconds") or v.get("duration_seconds") or 0)
        total += dur
        pts = v.get("points", [])
        imp = [p.get("importance", 0) for p in pts]
        videos.append({"n": i, "video_id": s.get("video_id"), "title": s.get("title"), "channel": s.get("channel"),
                       "url": s.get("url"), "duration_seconds": dur, "one_sentence": v.get("one_sentence", ""),
                       "points": len(pts), "core_points": sum(1 for x in imp if x >= 4),
                       "avg_importance": round(sum(imp) / len(imp), 2) if imp else 0})
        all_points += [dict(p, video=i) for p in pts]

    top = dedupe(all_points, "point", lambda x: (x.get("importance", 0), -x.get("video", 0)))
    top = sorted(top, key=lambda x: (x.get("importance", 0), -x.get("video", 0)), reverse=True)[: a.points]

    # concept x video matrix
    concepts = []  # [{term, videos:set}]
    for i, v in enumerate(vids, 1):
        for c in v.get("concepts", []):
            term = c.get("term", "").strip()
            if not term:
                continue
            hit = next((k for k in concepts if similar(k["term"], term, 0.85)), None)
            if hit:
                hit["videos"].add(i)
            else:
                concepts.append({"term": term, "explanation": c.get("explanation", ""), "videos": {i}})
    concepts.sort(key=lambda k: (-len(k["videos"]), min(k["videos"]), k["term"].lower()))
    for k in concepts:
        k["videos"] = sorted(k["videos"])

    overview = {"videos": videos, "total_duration_seconds": total, "top_points": top, "concepts": concepts,
                "shared_concepts": [k["term"] for k in concepts if len(k["videos"]) > 1]}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(overview, f, indent=2, ensure_ascii=False)
    with open(a.matrix, "w", encoding="utf-8") as f:
        f.write(matrix_html(concepts, videos, a.max_concepts))
    print(f"OK {a.out} VIDEOS={len(videos)} TOTAL={fmt(total)} TOP_POINTS={len(top)} "
          f"CONCEPTS={len(concepts)} SHARED={len(overview['shared_concepts'])} MATRIX={a.matrix}")
    for v in videos:
        print(f"  #{v['n']} {fmt(v['duration_seconds']):>8} core={v['core_points']} avg={v['avg_importance']} {str(v['title'])[:60]}")


def matrix_html(concepts, videos, limit):
    rows = concepts[:limit]
    head = "".join(f'<th style="text-align:center;width:{max(5, 60 // max(len(videos), 1))}%">#{v["n"]}</th>' for v in videos)
    out = [f'<table class="matrix"><tr><th>Concept</th>{head}<th style="width:7%;text-align:center">Videos</th></tr>']
    for k in rows:
        cells = "".join('<td style="text-align:center;color:#1f4e8c;font-size:11pt">●</td>' if v["n"] in k["videos"]
                        else '<td style="text-align:center;color:#d5dce6">·</td>' for v in videos)
        out.append(f'<tr><td>{html.escape(k["term"])}</td>{cells}<td style="text-align:center"><b>{len(k["videos"])}</b></td></tr>')
    out.append("</table>")
    if len(concepts) > limit:
        out.append(f'<p class="muted small">Showing the {limit} most shared of {len(concepts)} concepts.</p>')
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="mode", required=True)
    v = sub.add_parser("video")
    v.add_argument("dir")
    v.add_argument("--index")
    v.add_argument("--points", type=int, default=10)
    v.add_argument("--out", default="merged.json")
    v.add_argument("--svg", default="coverage.svg")
    p = sub.add_parser("playlist")
    p.add_argument("paths", nargs="+")
    p.add_argument("--points", type=int, default=12)
    p.add_argument("--out", default="overview.json")
    p.add_argument("--matrix", default="matrix.html")
    p.add_argument("--max-concepts", type=int, default=18)
    a = ap.parse_args()
    merge_video(a) if a.mode == "video" else merge_playlist(a)


if __name__ == "__main__":
    main()
