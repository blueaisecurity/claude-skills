"""List the videos in a YouTube playlist without downloading anything (uses yt-dlp).

Usage: python list_playlist.py <playlist-url> [--out playlist.json] [--max 50] [--install-ytdlp]
Prints BLOCKED if YouTube can't be reached, and NEED_YTDLP if yt-dlp isn't installed (ask the user, then run
again with --install-ytdlp). Otherwise prints a numbered list with durations
and writes <out>: {"title", "channel", "url", "count", "total_seconds", "videos": [{n, id, title, url, duration_seconds}]}
"""
import argparse
import json
import subprocess
import sys


def ensure_ytdlp(install):
    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        if not install:
            print("NEED_YTDLP: yt-dlp isn't installed. Ask the user first, then run again with --install-ytdlp.")
            sys.exit(4)
        cmd = [sys.executable, "-m", "pip", "install", "-q", "yt-dlp>=2026.8.19"]  # minimum version; YouTube changes often, so no exact pin
        if subprocess.call(cmd) != 0:
            subprocess.call(cmd + ["--break-system-packages"])


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
    ap.add_argument("--install-ytdlp", action="store_true", help="install yt-dlp with pip if it's missing (ask the user first)")
    a = ap.parse_args()

    ensure_ytdlp(a.install_ytdlp)
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
