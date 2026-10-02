# yt-notes

Turns a YouTube video, a 2+ hour talk or a whole playlist into a short, visual study-guide PDF. A 1-hour video
becomes a 5-minute read, with links back to the moments worth watching.

Version 3.1.0 · [Changelog](https://github.com/blueaisecurity/claude-skills/blob/main/CHANGELOG.md)

## Use it

```
/yt-notes <video-or-playlist-link> [max-pages] [compare] [overview-only] [focus]
```

| You type | You get |
|---|---|
| `/yt-notes https://youtu.be/VIDEO_ID` | It asks how long and whether to compare, then runs |
| `/yt-notes https://youtu.be/VIDEO_ID 2 no` | A 2-page recap |
| `/yt-notes https://youtu.be/VIDEO_ID 5 articles` | 5 pages, compared with articles |
| `/yt-notes https://www.youtube.com/playlist?list=PLAYLIST_ID 3 no` | A 3-page PDF per video, plus a playlist overview |

`compare` is `no`, `articles`, `videos` or `both`. `focus` is anything else, such as "beginner level".

## What you get

- The summary, the key ideas, and whether you should still watch it
- The main points with clickable timestamps, and original diagrams
- Key concepts in plain words, what to remember, flashcards and a self-test
- Fact-checks of key claims, and what the video leaves out
- Long videos are read part by part, so the middle counts as much as the start
- Playlists get an overview PDF with an "if you only watch one" ranking

## Needs

Node.js with playwright-core, and Edge or Chrome to print the PDF. Python is optional and makes getting captions
faster. The skill asks before it installs anything.

## Security

- Without asking, it only checks your Python version, reads any file you can open, searches the web and writes
  inside `yt-notes-work/`. Opening a web page, running a script and every install show a permission prompt
  first, unless your own settings already allow them.
- No hooks, no MCP servers, no telemetry, and nothing runs when a session starts.
- `yt-notes-work/` holds full transcripts. The skill adds a `.gitignore` there, so git ignores them.
- In the Claude apps, the skill can start on its own when a request fits it.
- Release v1.0.0 (yt-notes 3.1.0) was audited with
  [skill-audit](https://github.com/blueaisecurity/claude-skills/tree/main/skill-audit), in deep mode, on
  2 October 2026: no problems found.

## Responsible use

The notes are for personal study. Keep the source link (it is on every page) and don't republish them in place
of the video. They are AI-generated and can contain mistakes.

## License

MIT, see [LICENSE](LICENSE).
