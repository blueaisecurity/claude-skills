"""Download a YouTube video's subtitles as timestamped text using yt-dlp.

Usage: python get_transcript.py <url> [--out transcript.txt] [--lang en]
Prints BLOCKED if YouTube can't be reached, NO_SUBTITLES if the video has none.
Writes <out> (text) and <out-stem>.meta.json (title, channel, date, duration, chapters).
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys
import tempfile


def ensure_ytdlp():
    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        cmd = [sys.executable, "-m", "pip", "install", "-q", "yt-dlp"]
        if subprocess.call(cmd) != 0:
            subprocess.call(cmd + ["--break-system-packages"])


def ts(sec):
    sec = int(sec)
    return f"{sec // 60}:{sec % 60:02d}"


def vtt_to_blocks(path, block_chars=500):
    """Parse WebVTT, drop the rolling duplicates auto-captions produce, group into ~500-char blocks."""
    cues, seen = [], set()
    with open(path, encoding="utf-8") as f:
        text = f.read()
    for block in re.split(r"\n\s*\n", text):
        m = re.search(r"(\d+):(\d+):(\d+)[.,]\d+\s+-->", block)
        if not m:
            continue
        start = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
        for line in block.splitlines():
            if "-->" in line:
                continue
            line = re.sub(r"<[^>]+>", "", line).strip()
            if not line or line in seen:
                continue
            seen.add(line)
            cues.append((start, line))
    out, buf, first = [], "", None
    for start, line in cues:
        if first is None:
            first = start
        buf += line + " "
        if len(buf) > block_chars:
            out.append(f"[{ts(first)}] {buf.strip()}")
            buf, first = "", None
    if buf.strip():
        out.append(f"[{ts(first or 0)}] {buf.strip()}")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--out", default="transcript.txt")
    ap.add_argument("--lang", default="en")
    a = ap.parse_args()

    ensure_ytdlp()
    import yt_dlp

    tmp = tempfile.mkdtemp()
    opts = {
        "skip_download": True, "writesubtitles": True, "writeautomaticsub": True,
        "subtitleslangs": [a.lang, f"{a.lang}.*"], "subtitlesformat": "vtt",
        "outtmpl": os.path.join(tmp, "%(id)s.%(ext)s"), "quiet": True, "no_warnings": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(a.url, download=True)
    except Exception as e:  # network blocked, bot check, private video...
        print(f"BLOCKED: {e}")
        sys.exit(2)

    files = glob.glob(os.path.join(tmp, "*.vtt"))
    files.sort(key=lambda p: ("orig" in p, len(p)))  # prefer manual subtitles
    if not files:
        print("NO_SUBTITLES")
        sys.exit(3)

    with open(a.out, "w", encoding="utf-8") as f:
        f.write(vtt_to_blocks(files[0]))

    meta = {
        "title": info.get("title"), "channel": info.get("channel") or info.get("uploader"),
        "upload_date": info.get("upload_date"), "duration_seconds": info.get("duration"),
        "url": info.get("webpage_url"), "subtitle_file": os.path.basename(files[0]),
        "chapters": [{"start": ts(c["start_time"]), "title": c["title"]} for c in (info.get("chapters") or [])],
        "description": (info.get("description") or "")[:2500],
    }
    meta_path = os.path.splitext(a.out)[0] + ".meta.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2, ensure_ascii=False)
    print(f"OK {a.out} ({os.path.getsize(a.out)} bytes), {meta_path}")


if __name__ == "__main__":
    main()
