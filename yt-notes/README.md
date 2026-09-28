# yt-notes: turn a 1-hour YouTube video into a 5-minute read

A skill for [Claude](https://claude.ai) (Claude Code and the Claude apps) that converts a YouTube video
into a short, visual **study-guide PDF**: a 30-second TL;DR, a "should you still watch it?" verdict,
main points with clickable timestamps, original diagrams, key concepts explained, what to memorise,
flashcards and a self-test. It handles **2+ hour videos**, covering the middle as well as the start and end, turns **whole playlists**
into one overview plus a PDF per video, and can compare a video with other articles and videos.

Most videos are long and most of us don't have time for them. `yt-notes` gives you the useful part in
5 to 10 minutes of reading, and links back to the exact moments worth watching.

## Usage

```
/yt-notes <video-or-playlist-link> [max-pages] [compare] [overview-only] [focus]
```

| You type | You get |
|---|---|
| `/yt-notes https://youtu.be/VIDEO_ID` | It asks how long the PDF should be and whether to compare, then runs |
| `/yt-notes https://youtu.be/VIDEO_ID 2 no` | 2-page visual recap (about 3 minutes of reading) |
| `/yt-notes https://youtu.be/VIDEO_ID 5 articles` | 5 pages, including 1 page comparing the video with articles |
| `/yt-notes https://youtu.be/VIDEO_ID -> 10 -> both -> for a job interview` | A detailed 10-page guide, written for interview prep, compared with articles and videos |
| `/yt-notes https://www.youtube.com/playlist?list=PLAYLIST_ID 3 no` | A 3-page PDF per video plus a playlist overview |
| `/yt-notes https://www.youtube.com/playlist?list=PLAYLIST_ID overview-only` | Just the playlist overview |

- `max-pages`: a hard upper limit (1 to 30). The skill fits the content and a reading-time budget to it.
- `compare`: `no`, `articles`, `videos` or `both`.
- `focus`: anything else, for example "beginner level" or "answer in Spanish".

## What's in the PDF

| Section | Purpose |
|---|---|
| Cover | One-sentence summary, 3 key ideas, **should you still watch it?** (with timestamps), video length vs reading time |
| The whole video in one picture | One diagram of the whole video |
| Main points | 5 to 10 points with clickable timestamps and why each matters |
| Key concepts | Plain-language explanations, examples and small diagrams |
| Learn and memorise | Must-remember list, frameworks drawn as diagrams, flashcards |
| Apply it / Test yourself | Practical actions and self-test questions (answers at the end) |
| Read with care | Fact-checks of key claims, sales pitches, what the video leaves out |
| How this video compares | Optional: agreement table against other sources, with a verdict |
| About this document | Source link, creator, date generated, caption type, AI-generated notice |

Every page footer links to the original video.

## Long videos (2+ hours)

A single pass over a 2 to 3 hour transcript tends to give too much weight to the start and end, and too little to
the middle.
For videos over about 60 minutes, `yt-notes`:

1. splits the transcript by the creator's chapters (from YouTube, or read from the description), or into 15-minute
   blocks, with `scripts/chunk_transcript.js`
2. summarises each part into a standard JSON format (`references/summary-schema.md`), in parallel when
   the session supports subagents
3. merges the parts with `scripts/merge_summaries.js video`: removes duplicates, ranks points across the
   **whole** video, and guarantees that every part with a useful point is represented
4. adds a **coverage timeline** to the PDF showing which parts of the video the notes draw from, and which
   were skipped as filler (sponsor reads, intros, breaks)

## Playlists

Give it a playlist link (or several video links) and it lists the videos with their total length, lets you
choose which to process (up to 10 per run), makes a PDF per video, and then builds an **overview PDF**:

- the playlist in one sentence and a ranked "if you only watch one" table, including which videos are safe to skip
- a map of how the videos fit together, and a recommended order
- a concept × video grid showing which video covers what, plus repeats and contradictions
- the top points across all videos with timestamp links, a shared glossary and flashcards with duplicates removed

Work files go in `yt-notes-work/<VIDEO_ID>/` in your project, so re-runs and interrupted playlists resume where
they stopped. That folder holds full transcripts, so the skill puts a `.gitignore` inside it and git ignores it.

Long videos and playlists are new in this version. They were tested on a 93-minute podcast with 16 chapters
(9 parts, summarised in parallel) and on 4 videos from a playlist. If a run goes wrong, please open an issue.

## Install

| Where | How |
|---|---|
| Claude Code, all projects | Copy this folder to `~/.claude/skills/yt-notes/` (Windows: `%USERPROFILE%\.claude\skills\yt-notes\`) |
| Claude Code, one project | Copy this folder to `<project>/.claude/skills/yt-notes/` |
| Claude apps | In your copy, delete the `argument-hint` and `disable-model-invocation` lines at the top of `SKILL.md` (the apps accept only `name`, `description`, `allowed-tools`, `license`, `compatibility` and `metadata`, and reject the upload otherwise). Zip the folder so the zip holds `yt-notes/SKILL.md`, then add it in **Customize > Skills** (code execution must be on). The instructions include a fallback for when the scripts aren't bundled |

If you have skills with the same name in several places, Claude Code uses the personal one
(`~/.claude/skills`) over the project one.

## Requirements

- **Node.js** and `npm i -g playwright-core`, used to print the PDF with the Edge or Chrome you already have
  (no browser download), and to split and combine long videos and playlists.
- **Python 3** (optional) for the fastest caption route (`yt-dlp`). Without it, the skill reads the captions
  through the browser. If Python or `yt-dlp` is missing, the skill asks before installing anything
  (winget on Windows, Homebrew on macOS, apt on Linux, then pip for `yt-dlp`).
- Optional: `pdftoppm` (poppler) so Claude can look at the pages and check the layout.

## How it gets the captions

1. **yt-dlp** (`scripts/get_transcript.py`) downloads the video's subtitles, preferring the creator's own over auto-generated ones.
2. If that's blocked, **the browser route** (`scripts/capture_captions.js`) runs in the YouTube tab through
   Claude in Chrome or the Claude app's browser. It waits for ads to finish, then records the caption file
   the YouTube player itself loads for that video. It only reads; it doesn't sign in, click links or send data anywhere.
3. If both fail, Claude asks you to paste the transcript from YouTube's **… → Show transcript** panel.

## Design choices

- **Summaries, not transcripts.** The PDF is written in Claude's own words. It never includes the transcript or long quotes.
- **Original diagrams.** Nine inline-SVG patterns in `assets/diagrams.html` (flow, cycle, compare, layers, hub,
  timeline, bars, matrix, architecture). Claude draws its own diagrams of the ideas and never copies the video's slides or logos.
- **Reading-time budget.** `render_pdf.js` counts pages and words and warns when the PDF is over the limit.
- **Fact-checking.** Up to three key claims are checked against primary sources, and anything sponsored or sold in the video is flagged.
- **Prompt-injection safe.** Transcripts and web pages are treated as data, never as instructions.
- **Least privilege.** Only harmless commands run without asking, and nothing is installed unless you agree
  (see Security below).

## Security

This skill was checked with [skill-audit](../skill-audit/) before release.

**Runs without asking (`allowed-tools`):** `python --version`, `py --version`, `python3 --version`, `Read`, `Write`,
`WebSearch`, `WebFetch`. Nothing else. Its scripts and `pdftoppm` each ask the first time; in Claude Code you can
choose "Yes, and don't ask again", so **you** decide what runs silently, not the skill's author.

**What each script does:**

| Script | Reads | Runs | Network |
|---|---|---|---|
| `get_transcript.py` | nothing of yours | `pip install yt-dlp`, only with `--install-ytdlp` after you agree | YouTube (captions), PyPI |
| `list_playlist.py` | nothing of yours | `pip install yt-dlp`, only with `--install-ytdlp` after you agree | YouTube (playlist list), PyPI |
| `chunk_transcript.js` | the transcript file | nothing | none |
| `merge_summaries.js` | the summary JSON files | nothing | none |
| `render_pdf.js` | the notes HTML | `npm root -g`; your installed Edge/Chrome (headless) | none |
| `capture_captions.js` | runs inside the YouTube tab; records the player's own caption response | nothing | none of its own |
| `list_playlist.js` | runs inside the YouTube playlist tab; reads the page | nothing | none of its own |

Installs it may perform, always after asking you: Python (winget, Homebrew or apt), `yt-dlp` (PyPI, version
2026.8.19 or newer), `playwright-core` (npm). Transcripts and web pages are treated as untrusted data, never as
instructions.

## Responsible use

The notes are for personal study. Respect creators: keep the source link (the skill adds it to every page),
don't republish the notes as a replacement for the video, and follow YouTube's Terms of Service.
The PDFs are AI-generated and can contain mistakes, so check the original for anything important.

## Files

```
yt-notes/
├── SKILL.md                    instructions Claude follows
├── assets/
│   ├── template.html           study-guide PDF layout (edit colours and sections here)
│   ├── overview-template.html  playlist overview layout
│   └── diagrams.html           9 diagram patterns
├── references/
│   ├── summary-schema.md       JSON format for part and video summaries
│   └── part-agent-prompt.md    prompt for parallel part-summary subagents
└── scripts/
    ├── get_transcript.py       captions via yt-dlp
    ├── capture_captions.js     captions via the browser
    ├── chunk_transcript.js     split long transcripts by chapter or time
    ├── merge_summaries.js      combine parts (long video) or videos (playlist); coverage timeline, concept grid
    ├── list_playlist.py        list a playlist's videos via yt-dlp
    ├── list_playlist.js        list a playlist's videos via the browser
    └── render_pdf.js           HTML → A4 PDF with source footer, page and reading-time checks
```

## License

MIT, see [LICENSE](LICENSE).
