"""List the videos in a YouTube playlist without downloading anything (uses yt-dlp).

Usage: python list_playlist.py <playlist-url> [--out playlist.json] [--max 50]
Prints BLOCKED if YouTube can't be reached, and NEED_YTDLP if yt-dlp isn't installed (this script never installs
anything). Otherwise prints a numbered list with durations
and writes <out>: {"title", "channel", "url", "count", "total_seconds", "videos": [{n, id, title, url, duration_seconds}]}
"""
import argparse
import json
import sys


def ensure_ytdlp():
    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        print("NEED_YTDLP: yt-dlp isn't installed.")
        sys.exit(4)


def fmt(sec):
    sec = int(sec or 0)
    h, m, s = sec // 3600, (sec % 3600) // 60, sec % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def main():
    if hasattr(sys.stdout, "reconfigure"):  # Windows consoles default to cp1252, which garbles titles
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--out", default="playlist.json")
    ap.add_argument("--max", type=int, default=50)
    a = ap.parse_args()

    ensure_ytdlp()
    import yt_dlp

    opts = {"extract_flat": "in_playlist", "skip_download": True, "quiet": True, "no_warnings": True,
            "noprogress": True, "playlistend": a.max}
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(a.url, download=False)
    except Exception as e:
        print(f"BLOCKED: {e}")
        sys.exit(2)

    videos = []
    for i, e in enumerate(info.get("entries") or [], 1):
        if not e or not e.get("id"):
            continue
        videos.append({"n": i, "id": e["id"], "title": e.get("title"),
                       "url": f"https://www.youtube.com/watch?v={e['id']}",
                       "duration_seconds": int(e.get("duration") or 0)})
    total = sum(v["duration_seconds"] for v in videos)
    out = {"title": info.get("title"), "channel": info.get("channel") or info.get("uploader"),
           "url": a.url, "count": len(videos), "total_seconds": total, "videos": videos}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)

    print(f"OK {a.out} PLAYLIST=\"{out['title']}\" VIDEOS={len(videos)} TOTAL={fmt(total)}")
    for v in videos:
        print(f"  {v['n']:>2}. {fmt(v['duration_seconds']):>8}  {v['title']}")


if __name__ == "__main__":
    main()
