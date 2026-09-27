# Claude skills

Skills for [Claude](https://claude.ai), free and open source. Each skill is one folder with a `SKILL.md`
(the steps Claude follows) and any scripts or templates it needs.

## Skills

| Skill | What it does | Run it with |
|---|---|---|
| [yt-notes](yt-notes/) | Turns a YouTube video into a short, visual study-guide PDF | `/yt-notes <youtube-link>` |

## 1. Get a skill

Each skill is a folder at the top of this repo. You only need the folder of the skill you want.

**One skill** (downloads only that folder):

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/blueaisecurity/claude-skills.git
cd claude-skills
git sparse-checkout set yt-notes
```

**All skills:**

```bash
git clone https://github.com/blueaisecurity/claude-skills.git
cd claude-skills
```

No git? Click **Code > Download ZIP** on this page and unzip it.

To update later, run `git pull` in the `claude-skills` folder and copy the skill again.

## 2. Install it

Copy the skill folder to one of these places:

| Where | Path | Who gets it |
|---|---|---|
| Claude Code, all your projects | `~/.claude/skills/yt-notes/`<br>Windows: `%USERPROFILE%\.claude\skills\yt-notes\` | You, on this computer |
| Claude Code, one project | `<project>/.claude/skills/yt-notes/` | Everyone in that project, once you commit it |
| Claude apps (claude.ai, desktop) | Zip the folder so the zip holds `yt-notes/SKILL.md`, then add it in **Customize > Skills** | Your Claude account (code execution must be on) |

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

## 3. How Claude finds and runs a skill

1. **When a session starts,** Claude Code reads only the name and description of each skill.
2. **When you run it** (`/yt-notes ...`), Claude loads the full `SKILL.md` and follows its steps in order.
3. **Scripts and templates** in the skill folder are opened only when a step needs them.
4. **Same skill in two places?** This order decides which one runs: your organisation's managed skills
   first, then personal (`~/.claude/skills`), then project (`.claude/skills`). So a personal copy of
   `yt-notes` wins over a project copy.

Claude can also start a skill by itself when your request matches its description. `yt-notes` is set to run
only when you type `/yt-notes`.

## 4. Use yt-notes

```
/yt-notes <youtube-link> [max-pages] [compare] [focus]
```

| You type | You get |
|---|---|
| `/yt-notes https://youtu.be/VIDEO_ID` | It asks how long the PDF should be and whether to compare, then runs |
| `/yt-notes https://youtu.be/VIDEO_ID 2 no` | A 2 page recap, about 3 minutes of reading |
| `/yt-notes https://youtu.be/VIDEO_ID 5 articles` | 5 pages, including a comparison with articles |

It needs Node.js. Setup and what the PDF contains: [yt-notes/README.md](yt-notes/README.md).

## Before you install any skill

A skill can run commands on your computer. Read its `SKILL.md` and scripts first, ours included.

## License

MIT, see [LICENSE](LICENSE).
