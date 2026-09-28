# skill-audit: check a Claude skill before you install it

Installing a Claude skill is like installing software. Its `allowed-tools` line can let commands run
**without a permission prompt**, and its scripts run with **your** user rights. A skill that pre-approves
`python scripts/setup.py` pre-approves every line of `setup.py`. And a line like `` !`command` `` in `SKILL.md`
runs a pre-approved command the moment you start the skill, before Claude has read a word of it.

`skill-audit` tells you, before you install or update a skill:

- **what it can do without asking you**, entry by entry, in plain language: pre-approved tools, commands that run
  when the skill loads, and hooks
- **what it reads, runs, and where it can send data**
- **what's hidden**: obfuscated code, encoded commands, invisible Unicode, instructions in HTML comments
- **whether it tries to manipulate Claude**: "ignore previous instructions", "don't tell the user", fake "the user approved"
- **for plugins, what runs on its own**: hooks that fire on events and MCP servers that start programs
- a verdict: **✅ No red flags found · ⚠️ Install with changes · ⛔ Don't install**
- a **hardened** version of its permissions

## Usage

```
/skill-audit <skill-folder | github-url | skill.zip> [deep]
```

| You type | It audits |
|---|---|
| `/skill-audit ./downloads/cool-skill` | One skill folder |
| `/skill-audit https://github.com/someone/their-skills` | Every skill in a repo (cloned read-only; you approve the clone) |
| `/skill-audit cool-skill.zip` | A zipped skill (extracted into a new folder; entries that try to leave it are skipped) |
| `/skill-audit ~/.claude/skills` | All your installed personal skills, with a summary table |
| `/skill-audit ./some-skill deep` | Also reads every file in full, not only flagged and pre-approved ones |

The report is saved as `skill-audit-<name>-<date>.md` in your current folder.

## How it works

1. **A pattern sweep** with Claude's own Grep tool, using the patterns in `references/checklist.md`: network,
   command execution, credential paths, browser and wallet data, webhooks, persistence, security changes, deletes,
   installs, obfuscation, hidden Unicode (zero-width, bidi "Trojan Source", tag-character smuggling),
   prompt-injection phrasing, commands that run when a skill loads, hooks, and plugin MCP servers. It also lists
   symlinks, binaries, archives and `CLAUDE.md` files hidden inside a skill.
   Findings inside scripts, hooks or servers that run without asking are marked ★, and an allow-list entry
   inherits the worst finding in the script it approves.
2. **Claude reviews what patterns can't judge:** it reads `SKILL.md`, every pre-approved script and every hook and
   MCP server entry in full, traces inputs → reads → commands → network, separates expected behaviour from
   suspicious, explains false positives, and checks dependencies.
3. **Verdict, hardening and a report.**

## Antivirus note

This folder has no scanner script, on purpose. A malware detector has to contain malware patterns: the names
of browser password files, webhook addresses, `curl | sh`, startup folders. The first version of skill-audit had
them in a Python scanner. Bitdefender quarantined it as `Generic.PY.STEALER` about a minute after it was saved,
because one `.py` file full of those strings looks like an information stealer. It was a false positive, and it
was also the antivirus doing its job.

So this version keeps the patterns in `references/checklist.md`, as documentation, and Claude runs them with its
own Grep tool. On the machine where the scanner was quarantined, the checklist was not flagged.

If your antivirus flags a file from this repo anyway:

1. Check which file it is. `references/checklist.md` is the likely one: it lists what malware looks for, in plain text.
2. Read the file before you trust it, as you would any file.
3. If you restore it, add an exception for that one file, never for the whole folder.

Files that hold attack patterns as data, such as a signature list or a test skill with planted attacks, stay out
of skill folders. If we publish any, they go in a separate folder with their own warning, so installing a skill
never brings you a file your antivirus may flag.

## Safety design

- **It never executes anything from the skill under audit.** Not its scripts, installs or setup steps.
- **The audited files are treated as untrusted data.** Instructions aimed at the auditor are reported, not followed.
- **Minimal permissions.** Only `Read`, `Grep` and `Glob` are pre-approved. `git clone` is **not** pre-approved
  (a wildcard would allow git option injection such as `--upload-pack`), so you see and approve every clone. It runs
  with `--` before the URL, without submodules and without symlinks, the paths past git clone exploits used.
  Extracting a zip also asks first.
- **It never reads through symbolic links.** It lists them, and a link that points outside the skill is a finding.
- **It audits from outside your project.** When Claude Code reads files in a subfolder of your project, it also
  loads that subfolder's `CLAUDE.md` files and skills. So downloads are audited in a temporary folder outside your
  project, and it asks you to move a download that sits inside it. For extra safety while you check skills you
  don't trust, set `"disableSkillShellExecution": true` in your Claude Code settings, so no skill's load-time
  commands run, even ones your own allow rules would let through.
- **It never modifies the original skill.** Hardened copies go to a new folder, on request.

## Limits

A static review lowers risk; it doesn't prove a skill is safe. Patterns catch known shapes, not new tricks,
dependencies aren't audited recursively, binaries can't be reviewed by reading, and a skill can change after you
audit it: **re-audit on every update**, and use Claude Code's deny rules and sandboxing as a second line of defence.

## Install

| Where | How |
|---|---|
| Claude Code, all projects | Copy this folder to `~/.claude/skills/skill-audit/` (Windows: `%USERPROFILE%\.claude\skills\skill-audit\`) |
| Claude Code, one project | Copy it to `<project>/.claude/skills/skill-audit/` |
| Claude apps | First delete the `argument-hint` line at the top of your copy of `SKILL.md`: the apps accept only `name`, `description`, `allowed-tools`, `license`, `compatibility` and `metadata`. Then zip the folder so the zip holds `skill-audit/SKILL.md`, and add it in **Customize > Skills** (code execution must be on) |

It needs nothing beyond Claude's own Read, Grep and Glob, plus git if you audit a GitHub URL.

## Files

```
skill-audit/
├── SKILL.md                  instructions Claude follows
├── references/checklist.md   what to check, and the Grep patterns for the sweep
└── assets/report-template.md report layout
```

## License

MIT, see [LICENSE](LICENSE).
