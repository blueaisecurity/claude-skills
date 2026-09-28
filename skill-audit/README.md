# skill-audit: check a Claude skill before you install it

Installing a Claude skill is like installing software. Its `allowed-tools` line can let commands run
**without a permission prompt**, and its scripts run with **your** user rights. A skill that pre-approves
`python scripts/setup.py` pre-approves every line of `setup.py`. And a line like `` !`command` `` in `SKILL.md`
runs a pre-approved command the moment you start the skill, before Claude reads any of it.

`skill-audit` tells you, before you install or update a skill:

- **what it can do without asking you**, entry by entry, in plain language: pre-approved tools, commands that run
  when the skill loads, and hooks
- **everything it installs and runs**, in one table: programs, packages, libraries, scripts and commands, each
  with its version and whether you're asked first
- **where it connects and what it reads and writes**
- **what's hidden**: obfuscated code, encoded commands, invisible Unicode, instructions in HTML comments, files
  hidden from the search by an ignore file, and `CLAUDE.md` files or symbolic links hidden inside a skill
- **whether it tries to manipulate Claude**: "ignore previous instructions", "don't tell the user", fake "the user
  approved", or instructions fetched from the web after you reviewed it
- **for plugins, what runs on its own**: hooks that fire on events and MCP servers that start programs
- **install tricks**: install hooks in `package.json`, unpinned packages, and zips with entries that try to write outside their folder
- **where it comes from**: owner, repo age, stars, releases, and names that copy a well-known skill. These can only
  make the verdict stricter: stars can be bought, so popularity never makes a risky skill look safe. The lookups use
  the network, so they ask first
- a verdict: **✅ No problems found · ⚠️ Install with changes · ⛔ Don't install**
- a **hardened** version of its permissions
- a **full report**, plus a **one-page PDF summary** per skill

## Usage

```
/skill-audit <skill-folder | github-url | skill.zip> [deep] [context: who made it, where it came from, who will use it]
```

| You type | It audits |
|---|---|
| `/skill-audit ./downloads/cool-skill` | One skill folder |
| `/skill-audit https://github.com/someone/their-skills` | Every skill in a repo (cloned read-only; you approve the clone) |
| `/skill-audit cool-skill.zip` | A zipped skill (extracted into a new folder; entries that try to leave it are skipped) |
| `/skill-audit ~/.claude/skills` | All your installed personal skills, with a summary table |
| `/skill-audit ./some-skill deep` | Also reads every file in full, not only flagged and pre-approved ones |
| `/skill-audit ./onboarding context: built by our HR team, used by recruiters` | Also checks the skill against what you say it is and who will use it |

### Adding context

Tell skill-audit what you know about the skill, in your own words, after `context:`. For example, "built
internally by the platform team", "downloaded from a public marketplace", or "the HR team will use it with
candidate data". It uses the context in three ways:

1. **Purpose.** Does the skill do only what you say it's for? A recruiting skill that uploads files to a web
   service, or an "internal" tool that calls outside servers, is a finding.
2. **Stakes.** Who will use it decides how serious a finding is. For a sensitive audience (HR, finance, legal,
   admins, anyone with customer or production data) or a wide one (a company-wide marketplace), risky findings
   count more.
3. **Origin.** Your claim is checked against the files. "Internal" should match the owner, domains and package
   names in the code. If the files say otherwise, that's a finding in itself.

Context can mark a finding as expected when the files confirm it, and it can make a finding more serious. It
never removes a reason not to install, and the report says what the context changed. Without context, the audit
runs as usual.

The full report is saved as `skill-audit-<name>-<date>.md` in your current folder, with a short PDF summary
next to it: one page per skill with the verdict, what runs without asking, what it installs, where it connects,
the top risks and safer settings. The PDF is printed with the Edge or Chrome you already have, after you approve
the command. With no browser you get the summary as an HTML page instead.

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
3. **Verdict, hardening and a report.** When a skill sits between two verdicts, it always gets the stricter one.
   Anything the audit couldn't read never counts in the skill's favour: an MCP server or hook whose code is
   downloaded at install, and wasn't audited, means "don't install" until it is. One exception: when that part is
   an extra the skill doesn't need, such as telemetry, and you can switch it off before first use, the verdict is
   "install with changes", and switching it off is the first change. Small risks and plain bugs are listed as
   notes and don't change the verdict. A clean skill can still come with optional "worth considering" changes,
   such as pinning a version.

## Antivirus note

This folder has no scanner script, on purpose. A malware detector has to contain malware patterns: the names
of browser password files, webhook addresses, `curl | sh`, startup folders. The first version of skill-audit had
them in a Python scanner. Bitdefender quarantined it as `Generic.PY.STEALER` about a minute after it was saved,
because one `.py` file full of those strings looks like an information stealer. It was a false positive, and it
was also the antivirus working as it should.

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
  don't trust, turn off load-time commands (next section).
- **It never modifies the original skill.** Hardened copies go to a new folder, on request.

## Turn off commands that run when a skill loads

A line in a skill's `SKILL.md` can run a command the moment you start the skill, before Claude reads the rest.
Claude Code checks it against your permission rules, but never shows you a prompt for it. If you don't need
this feature, turn it off in your Claude Code settings file: `~/.claude/settings.json`, on Windows
`%USERPROFILE%\.claude\settings.json`. If the file doesn't exist, create it with this:

```json
{
  "disableSkillShellExecution": true
}
```

If it already has settings, add `"disableSkillShellExecution": true` as one more line inside the outer braces,
with a comma after the line before it. From then on, Claude Code skips these commands in the skills you and your
projects install. It doesn't cover skills your organisation manages centrally or skills built into Claude Code.
skill-audit finds these lines either way and shows what each one runs; it never changes your settings.

## Limits

A review by reading lowers risk; it doesn't prove a skill is safe. Patterns find known attacks, not new ones,
dependencies aren't audited one by one, binaries can't be reviewed by reading, and a skill can change after you
audit it: **re-audit on every update**, and also use Claude Code's deny rules and sandboxing, so that what the
review misses can still be blocked.

**What it catches, and what it still misses.** skill-audit reads a skill; it never runs it. In our tests it
found all nine attacks planted in a fake malicious skill, from a stolen SSH key to instructions hidden in invisible
characters. We also ran it on five official skills and plugins without telling it what to expect, to check that it
doesn't flag safe skills. The first
run flagged two of Anthropic's own skills for things that weren't risks, and the rules were fixed. Now Anthropic's
`frontend-design`, `pdf` and `webapp-testing` come out with "no problems found". Two from other vendors get "install with
changes", for real findings confirmed in their code. The fake malicious skill and a packed skill still get "don't
install". The paper [Cloak and Detonate](https://arxiv.org/abs/2607.02357) (July 2026) shows two ways to hide the
same attacks from a tool that reads:

1. **Packing.** A harmless-looking `SKILL.md` runs a small decoder that unpacks the real skill on first run from an
   encoded file, which the paper hides in `.git/`. Claude Code's Grep does not search `.git/`, so the pattern sweep
   never sees it. **skill-audit now catches this:** it lists the folders the search skips (`.git/`, `node_modules/`,
   dotfiles) and reads what's inside, flags a `SKILL.md` that points to a file the skill doesn't ship, and flags a
   script that decodes or unpacks a file into the skill's folder. Any of those is "don't install". We tested it on a
   packed skill built like the paper's example, and it caught all three.
2. **Split-up strings, which it still misses.** A command like `curl` or a path like `~/.aws/credentials`
   assembled from pieces at runtime matches no pattern. Claude may notice code that builds commands at runtime, but
   only in the files it reads in full, and not reliably. Any tool that only reads a skill has this limit, and
   skill-audit does not solve it. Use `deep` for skills you don't know, and don't rely on the review alone.

For split-up strings, the paper runs the skill in a sandbox and watches what it does. That caught 87 percent of
real malicious skills, packed or not. So treat skill-audit as a quick first check, not as proof that a skill is
safe: run skills you don't trust in a sandbox, and after the first run, compare the skill's files with the file
hashes in the report, since a self-extracting skill changes its own files.

## Install

| Where | How |
|---|---|
| Claude Code, all projects | Copy this folder to `~/.claude/skills/skill-audit/` (Windows: `%USERPROFILE%\.claude\skills\skill-audit\`) |
| Claude Code, one project | Copy it to `<project>/.claude/skills/skill-audit/` |
| Claude apps | First delete the `argument-hint` line at the top of your copy of `SKILL.md`: the apps accept only `name`, `description`, `allowed-tools`, `license`, `compatibility` and `metadata`. Then zip the folder so the zip holds `skill-audit/SKILL.md`, and add it in **Customize > Skills** (code execution must be on) |

It needs nothing beyond Claude's own Read, Grep and Glob, plus git if you audit a GitHub URL, and Edge or
Chrome for the PDF summary.

## Files

```
skill-audit/
├── SKILL.md                  instructions Claude follows
├── references/checklist.md   what to check, and the Grep patterns for the sweep
├── assets/report-template.md report layout
└── assets/report-summary.html one-page summary, printed to PDF (blocks scripts and outside loads)
```

## License

MIT, see [LICENSE](LICENSE).
