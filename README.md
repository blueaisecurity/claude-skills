# Claude skills

Skills for [Claude](https://claude.ai), free and open source. Each skill is one folder with a `SKILL.md`
(the steps Claude follows) and any scripts or templates it needs.

## Skills

| Skill | What it does | Run it with |
|---|---|---|
| [yt-notes](yt-notes/) | Turns a YouTube video, a 2+ hour talk or a whole playlist into short, visual study-guide PDFs | `/yt-notes <video-or-playlist-link>` |
| [skill-audit](skill-audit/) | Checks a skill or plugin for security risks before you install it: what runs without asking, scripts, hooks, hidden instructions | `/skill-audit <folder, GitHub link or zip>` |

## 1. Get a skill

Each skill is a folder at the top of this repo. You only need the folder of the skill you want.

**One skill** (downloads only that folder):

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/blueaisecurity/claude-skills.git
cd claude-skills
git sparse-checkout set yt-notes
```

(Use `skill-audit` instead of `yt-notes` for the other skill, or list both.)

**All skills:**

```bash
git clone https://github.com/blueaisecurity/claude-skills.git
cd claude-skills
```

No git? Click **Code > Download ZIP** on this page and unzip it.

To update later, run `git pull` in the `claude-skills` folder, delete your installed copy of the skill and copy
the folder again, so files removed in a new version don't stay behind.

## 2. Install it

Copy the skill folder to one of these places:

| Where | Path | Who gets it |
|---|---|---|
| Claude Code, all your projects | `~/.claude/skills/yt-notes/`<br>Windows: `%USERPROFILE%\.claude\skills\yt-notes\` | You, on this computer |
| Claude Code, one project | `<project>/.claude/skills/yt-notes/` | Everyone in that project, once you commit it |
| Claude apps (claude.ai, desktop) | First delete the `argument-hint` and `disable-model-invocation` lines at the top of your copy of `SKILL.md`: the apps accept only `name`, `description`, `allowed-tools`, `license`, `compatibility` and `metadata`. Then zip the folder so the zip holds `yt-notes/SKILL.md`, and add it in **Customize > Skills** | Your Claude account (code execution must be on) |

From inside `claude-skills`, on macOS or Linux:

```bash
mkdir -p ~/.claude/skills && cp -r yt-notes ~/.claude/skills/
```

On Windows (PowerShell):

```powershell
New-Item -ItemType Directory -Force "$HOME\.claude\skills" | Out-Null
Copy-Item -Recurse -Force yt-notes "$HOME\.claude\skills\"
```

Claude Code picks up the new skill without a restart. If the `skills` folder did not exist when the
session started, run `/reload-skills` once.

## 3. Use yt-notes

```
/yt-notes <video-or-playlist-link> [max-pages] [compare] [overview-only] [focus]
```

| You type | You get |
|---|---|
| `/yt-notes https://youtu.be/VIDEO_ID` | It asks how long the PDF should be and whether to compare, then runs |
| `/yt-notes https://youtu.be/VIDEO_ID 2 no` | A 2 page recap, about 3 minutes of reading |
| `/yt-notes https://youtu.be/VIDEO_ID 5 articles` | 5 pages, including a comparison with articles |
| `/yt-notes https://www.youtube.com/playlist?list=PLAYLIST_ID 3 no` | A 3 page PDF per video, plus an overview of the playlist |
| `/yt-notes https://www.youtube.com/playlist?list=PLAYLIST_ID overview-only` | Only the playlist overview |

Videos over about an hour are split into parts, summarised part by part and combined, so the middle of the
video counts as much as the start. Playlists are capped at 10 videos per run.

It needs Node.js. Python 3 is optional and makes getting captions faster; the skill asks before installing
anything. It keeps its work files, including full transcripts, in `yt-notes-work/` in your project, with a
`.gitignore` inside so git leaves them alone. Setup and what the PDFs contain: [yt-notes/README.md](yt-notes/README.md).

## 4. Use skill-audit

```
/skill-audit <skill-folder | github-url | skill.zip> [deep]
```

| You type | It checks |
|---|---|
| `/skill-audit ./downloads/cool-skill` | One skill folder |
| `/skill-audit https://github.com/someone/their-skills` | Every skill in a repo (you approve the clone first) |
| `/skill-audit ~/.claude/skills` | All your installed personal skills, with a summary table |

You get a verdict (no red flags found, install with changes, or don't install), what the skill can do without
asking you, everything it installs and runs, where it comes from, the top risks, and safer permissions. It comes as a full report and
a short PDF summary, next to where you run it. It only uses Claude's
own Read, Grep and Glob tools and never runs anything from the skill it checks. Details:
[skill-audit/README.md](skill-audit/README.md).

## Before you install any skill

A skill can run commands on your computer: its `allowed-tools` line can let commands run without asking you,
a line like `` !`command` `` in its `SKILL.md` runs a pre-approved command the moment you start it, before
Claude reads anything, and its scripts run with your rights. Read its `SKILL.md` and scripts first, or run `/skill-audit` on it. That goes for ours too.

## If your antivirus flags a file

A security checker has to describe what malware looks like. `skill-audit/references/checklist.md` lists the
names of browser password files, webhook addresses and download-and-run commands, so the skill can search for
them. It is plain text, and nothing in it runs. The first version of skill-audit kept the same strings in a
Python scanner, and Bitdefender quarantined it as a "stealer" within a minute. That is why this repo has no
scanner script. Details: [skill-audit/README.md](skill-audit/README.md#antivirus-note).

If a file is flagged: check which file it is, read it, and if you restore it, add an exception for that one file,
never for a whole folder. Anything that holds attack patterns as data, such as a signature list or a test skill with
planted attacks, stays out of the skill folders. If we publish any, it goes in its own folder with a warning, so
installing a skill never brings you such a file.

## Good to know: how Claude finds and runs a skill

1. **When a session starts,** Claude Code reads only the name and description of each skill.
2. **When you run it** (`/yt-notes ...`), Claude loads the full `SKILL.md` and follows its steps in order.
3. **Scripts and templates** in the skill folder are opened only when a step needs them.
4. **Same skill in two places?** This order decides which one runs: your organisation's managed skills
   first, then personal (`~/.claude/skills`), then project (`.claude/skills`). So a personal copy of
   `yt-notes` wins over a project copy.

Claude can also start a skill by itself when your request matches its description. `yt-notes` is set to run
only when you type `/yt-notes`. `skill-audit` can also start when you ask Claude to check a skill; it only reads.

## License

MIT, see [LICENSE](LICENSE).
