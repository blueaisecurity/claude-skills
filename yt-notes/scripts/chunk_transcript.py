"""Split a long timestamped transcript into chunks for part-by-part summarising.

Usage:
  python chunk_transcript.py transcript.txt [--meta transcript.meta.json] [--out chunks]
                             [--min-minutes 60] [--min-words 12000] [--target-minutes 15] [--force]

Input lines look like "[12:34] text ..." (the format both caption routes produce; minutes may exceed 59).
Prints MODE=single when the video is short enough to handle in one pass (nothing is written),
otherwise MODE=chunked and writes <out>/chunk-01.txt ... plus <out>/index.json.

Chunks follow the creator's chapters when there are at least 2; short chapters are merged and very long
ones split. Without chapters, chunks are ~target-minutes long and cut at a line boundary.
Standard library only.
"""
import argparse
import json
import os
import re
import sys

LINE = re.compile(r"^\[(\d+):(\d{2})(?::(\d{2}))?\]\s*(.*)$")


def to_seconds(ts):
    parts = [int(p) for p in str(ts).split(":")]
    s = 0
    for p in parts:
        s = s * 60 + p
    return s


def fmt(sec):
    sec = int(sec)
    h, m, s = sec // 3600, (sec % 3600) // 60, sec % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def read_lines(path):
    out = []
    with open(path, encoding="utf-8") as f:
        for raw in f:
            raw = raw.rstrip("\n")
            if not raw.strip():
                continue
            m = LINE.match(raw)
            if m:
                a, b, c, text = m.groups()
                sec = int(a) * 3600 + int(b) * 60 + int(c) if c else int(a) * 60 + int(b)
                out.append([sec, text])
            elif out:
                out[-1][1] += " " + raw.strip()
            else:
                out.append([0, raw.strip()])
    return out


def windows(lines, start, end, target):
    """Split lines in [start, end) into ~target-second pieces at line boundaries."""
    sel = [l for l in lines if start <= l[0] < end]
    pieces, cur, cur_start = [], [], start
    for l in sel:
        if cur and l[0] - cur_start >= target:
            pieces.append((cur_start, l[0], cur))
            cur, cur_start = [], l[0]
        cur.append(l)
    if cur:
        pieces.append((cur_start, end, cur))
    # merge a tiny tail (< 1/3 target) into the previous piece
    if len(pieces) > 1 and pieces[-1][1] - pieces[-1][0] < target / 3:
        a, b = pieces[-2], pieces[-1]
        pieces[-2:] = [(a[0], b[1], a[2] + b[2])]
    return pieces


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("transcript")
    ap.add_argument("--meta")
    ap.add_argument("--out", default="chunks")
    ap.add_argument("--min-minutes", type=float, default=60)
    ap.add_argument("--min-words", type=int, default=12000)
    ap.add_argument("--target-minutes", type=float, default=15)
    ap.add_argument("--force", action="store_true", help="chunk even if the video is short")
    a = ap.parse_args()

    lines = read_lines(a.transcript)
    if not lines:
        print("EMPTY_TRANSCRIPT")
        sys.exit(1)
    meta = {}
    if a.meta and os.path.exists(a.meta):
        with open(a.meta, encoding="utf-8") as f:
            meta = json.load(f)

    words = sum(len(t.split()) for _, t in lines)
    duration = int(meta.get("duration_seconds") or meta.get("lengthSeconds") or 0) or lines[-1][0] + 30
    minutes = duration / 60
    if not a.force and minutes < a.min_minutes and words < a.min_words:
        print(f"MODE=single DURATION={fmt(duration)} WORDS={words} (below {a.min_minutes:g} min and {a.min_words} words)")
        return

    target = a.target_minutes * 60
    chapters = []
    for c in meta.get("chapters") or []:
        try:
            chapters.append((to_seconds(c["start"]), c.get("title", "")))
        except (KeyError, ValueError):
            pass
    chapters.sort()

    chunks = []  # (start, end, title, lines)
    if len(chapters) >= 2:
        bounds = [(s, chapters[i + 1][0] if i + 1 < len(chapters) else duration, t) for i, (s, t) in enumerate(chapters)]
        if bounds[0][0] > 0:
            bounds.insert(0, (0, bounds[0][0], "Opening"))
        # merge short chapters (< 40% of target) forward, split long ones (> 2x target)
        merged = []
        for s, e, t in bounds:
            if merged and (merged[-1][1] - merged[-1][0]) < 0.4 * target:
                ps, pe, pt = merged[-1]
                merged[-1] = (ps, e, f"{pt} + {t}")
            else:
                merged.append((s, e, t))
        for s, e, t in merged:
            if e - s > 2 * target:
                parts = windows(lines, s, e, target)
                for i, (ps, pe, pl) in enumerate(parts, 1):
                    chunks.append((ps, pe, f"{t} (part {i}/{len(parts)})", pl))
            else:
                chunks.append((s, e, t, [l for l in lines if s <= l[0] < e]))
        source = "chapters"
    else:
        for ps, pe, pl in windows(lines, 0, duration, target):
            chunks.append((ps, pe, f"{fmt(ps)}–{fmt(pe)}", pl))
        source = "time windows"

    chunks = [c for c in chunks if c[3]]
    os.makedirs(a.out, exist_ok=True)
    index = []
    for i, (s, e, t, pl) in enumerate(chunks, 1):
        cid = f"chunk-{i:02d}"
        path = os.path.join(a.out, cid + ".txt")
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"# {cid} | {fmt(s)}-{fmt(e)} | {t}\n")
            for sec, text in pl:
                f.write(f"[{fmt(sec)}] {text}\n")
        index.append({"id": cid, "file": path, "start": s, "end": e, "start_ts": fmt(s), "end_ts": fmt(e),
                      "title": t, "words": sum(len(x.split()) for _, x in pl)})
    with open(os.path.join(a.out, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"duration_seconds": duration, "words": words, "split_by": source, "chunks": index}, f, indent=2, ensure_ascii=False)

    print(f"MODE=chunked DURATION={fmt(duration)} WORDS={words} CHUNKS={len(index)} SPLIT_BY={source}")
    for c in index:
        print(f"  {c['id']}  {c['start_ts']:>8}-{c['end_ts']:<8} {c['words']:>6} words  {c['title']}")


if __name__ == "__main__":
    main()
