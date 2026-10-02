# Changelog

Each release is a tag of this repo. Install a release, not the newest commit, and run `/skill-audit` on a new
version before you replace your copy.

## v1.0.0, 2 October 2026

The first tagged release: yt-notes 3.1.0 and skill-audit 1.0.0. Both were audited with skill-audit in deep mode
before release; the result is in each skill's README.

### yt-notes 3.1.0

The fixes from its own audit of 27 September, which said "install with changes":

- **Writes without asking only inside `yt-notes-work/`.** Before, it could write any file without asking.
- **Opening a web page asks first.** `WebFetch` is no longer pre-approved, so a transcript that tries to trick
  Claude can't send a file out without a prompt.
- **Installs you can see.** The scripts no longer install anything. After you agree, the skill runs
  `python -m pip install "yt-dlp>=2026.8.19"` as its own command, from the skill's own folder, so the permission
  prompt shows exactly what is installed and a file planted in the work folder can't stand in for pip. If it fails, the skill uses the browser route; it never forces the install with
  `--break-system-packages`, which overrides the protection on the system's own Python.
- **playwright-core at a fixed version, installed once for you** (`npm i -g playwright-core@1.63.0`), never into
  your project, and loaded only from there: a copy planted in the work folder is ignored.
- **The yt-dlp fallback command ignores config files** (`--ignore-config`), so a config file in an untrusted
  folder can't add options.
- **PDF printing is locked down.** While the PDF prints, page scripts are off and only local files load, so a
  link planted in the notes can't reach the internet.
- A much shorter README, with a note that the Claude apps can start the skill on their own, and the audit result.
- A version number in `SKILL.md` (`metadata.version`).

### skill-audit 1.0.0

The first numbered version. It holds everything since the first upload on 27 September 2026:

- Checks what runs without asking: `allowed-tools`, commands that run when a skill loads, skill hooks, plugin
  hooks and MCP servers, agents and commands.
- A pattern sweep with Claude's own Grep, a full read of everything that runs, and a report of everything a skill
  installs and runs, with versions.
- Catches self-extracting packing (from the Cloak and Detonate paper): files hidden in `.git/` and other folders
  the search skips, and a `SKILL.md` that points to a file the skill doesn't ship.
- Reputation and provenance, which can only make a verdict stricter.
- Optional context about who made a skill and who will use it.
- Calibrated on five official skills from Anthropic, Microsoft and Vercel. Its first real finding, in Microsoft's
  azure-cost plugin, was fixed two days after it was reported (see "Found with skill-audit" in its README).
- A one-page PDF summary next to every report.
- A version number in `SKILL.md` (`metadata.version`), a much shorter README, and a "Found with skill-audit"
  table in it.

## Before v1.0.0 (no tags)

- **27 September 2026:** yt-notes version 1 (`749d4f8`), version 2 with long videos and playlists (`c9453ed`),
  and version 3, which asks before installing anything (`113cb14`). skill-audit's first upload (`113cb14`).
- **27 and 28 September 2026:** skill-audit improvements, from `e0acd8a` to `14337f5`.
