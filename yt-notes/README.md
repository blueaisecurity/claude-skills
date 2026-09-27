# yt-notes: turn a 1-hour YouTube video into a 5-minute read

A skill for [Claude](https://claude.ai) (Claude Code and the Claude apps) that converts a YouTube video
into a short, visual **study-guide PDF**: a 30-second TL;DR, a "should you still watch it?" verdict,
main points with clickable timestamps, original diagrams, key concepts explained, what to memorise,
flashcards and a self-test. Optionally it compares the video with other articles and videos.

Most videos are long and most of us don't have time for them. `yt-notes` gives you the useful part in
5–10 minutes of reading, and links back to the exact moments worth watching.

## Usage

```
/yt-notes <youtube-link> [max-pages] [compare] [focus]
```

| You type | You get |
|---|---|
| `/yt-notes https://youtu.be/VIDEO_ID` | It asks how long the PDF should be and whether to compare, then runs |
| `/yt-notes https://youtu.be/VIDEO_ID 2 no` | 2-page visual recap (about 3 minutes of reading) |
| `/yt-notes https://youtu.be/VIDEO_ID 5 articles` | 5 pages, including 1 page comparing the video with articles |
| `/yt-notes https://youtu.be/VIDEO_ID -> 10 -> both -> for a job interview` | 10-page deep dive, tailored to interview prep, compared with articles and videos |

- `max-pages`: a hard upper limit (1–30). The skill fits the content and a reading-time budget to it.
- `compare`: `no`, `articles`, `videos` or `both`.
- `focus`: anything else, for example "beginner level" or "answer in Spanish".

## What's in the PDF

| Section | Purpose |
|---|---|
| Cover | One-sentence summary, 3 key ideas, **should you still watch it?** (with timestamps), video length vs reading time |
| The video at a glance | One diagram of the whole video |
| Main points | 5–10 points with clickable timestamps and why each matters |
| Key concepts | Plain-language explanations, examples and small diagrams |
| Learn and memorise | Must-remember list, frameworks drawn as diagrams, flashcards |
| Apply it / Test yourself | Practical actions and self-test questions (answers at the end) |
| Read with care | Fact-checks of key claims, sales pitches, what the video leaves out |
| How this video compares | Optional: agreement table against other sources, with a verdict |
| About this document | Source link, creator, date generated, caption type, AI-generated notice |

Every page footer links to the original video.

## Install

| Where | How |
|---|---|
| Claude Code, all projects | Copy this folder to `~/.claude/skills/yt-notes/` (Windows: `%USERPROFILE%\.claude\skills\yt-notes\`) |
| Claude Code, one project | Copy this folder to `<project>/.claude/skills/yt-notes/` |
| Claude apps | Zip this folder and upload it as a skill in Settings (the instructions include a fallback for when the scripts aren't bundled) |

If you have skills with the same name in several places, Claude Code uses the personal one
(`~/.claude/skills`) over the project one.

## Requirements

- **Node.js** and `npm i -g playwright-core`, used to print the PDF with the Edge or Chrome you already have (no browser download).
- **Python 3** for the fastest caption route (`yt-dlp`). If Python is missing, the skill installs it
  (winget on Windows, Homebrew on macOS, apt on Linux), and `yt-dlp` installs itself.
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
- **Least privilege.** In Claude Code, `allowed-tools` pre-approves only the skill's own scripts and the Python install; everything else asks first.

## Responsible use

The notes are for personal study. Respect creators: keep the source link (the skill adds it to every page),
don't republish the notes as a replacement for the video, and follow YouTube's Terms of Service.
The PDFs are AI-generated and can contain mistakes, so check the original for anything important.

## Files

```
yt-notes/
├── SKILL.md                    instructions Claude follows
├── assets/
│   ├── template.html           PDF layout (edit colours and sections here)
│   └── diagrams.html           9 diagram patterns
└── scripts/
    ├── get_transcript.py       captions via yt-dlp
    ├── capture_captions.js     captions via the browser
    └── render_pdf.js           HTML → A4 PDF with source footer, page and reading-time checks
```

## License

MIT, see [LICENSE](../LICENSE).
