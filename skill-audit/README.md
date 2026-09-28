# skill-audit

Checks a Claude skill or plugin for security risks before you install it. A skill can run commands on your
computer, some of them without asking you. skill-audit tells you what, in plain words, and gives a verdict.

Version 1.0.0 · [Changelog](https://github.com/blueaisecurity/claude-skills/blob/main/CHANGELOG.md)

## Use it

```
/skill-audit <skill-folder | github-url | skill.zip> [deep] [context: who made it, who will use it]
```

| You type | It checks |
|---|---|
| `/skill-audit ~/Downloads/cool-skill` | One skill folder |
| `/skill-audit https://github.com/someone/their-skills` | Every skill in a repo (you approve the download) |
| `/skill-audit ~/.claude/skills` | All your personal skills |
| `/skill-audit ./some-skill deep` | Also reads every file in full |
| `/skill-audit ./onboarding context: built by our HR team, used by recruiters` | Also checks it against what you say it is for |

## What you get

A verdict: **no problems found**, **install with changes** or **don't install**. Plus:

- what the skill can do without asking you
- everything it installs and runs, with versions
- where it connects, and what it reads and writes
- hidden tricks: encoded code, invisible text, instructions aimed at Claude
- safer permissions, a full report and a one-page PDF summary

## Found with skill-audit

| Reported | What it found | What happened |
|---|---|---|
| 28 September 2026 | Microsoft's official azure-cost plugin downloaded and ran the newest `@azure/mcp` at every session start, to send telemetry, and its README didn't say so | Microsoft documented it and how to turn it off two days later, and started the same change for four more plugins. [Issue](https://github.com/microsoft/GitHub-Copilot-for-Azure/issues/3276), [story](https://blueaisecurity.com/microsoft-ai-plugin-gap) |

## How it stays safe

- It never runs anything from the skill it checks.
- Without a prompt, it only reads, with Claude's own Read, Grep and Glob. Everything else it does, such as
  downloading, hashing files, looking a package up or saving the report, shows a permission prompt, unless your
  own settings already allow it.
- Downloads are checked in a temporary folder outside your project.
- No hooks, no MCP servers, no telemetry, and nothing runs in the background.
- Release v1.0.0 was audited with itself, in deep mode, on 2 October 2026: no problems found.

## Limits

A review by reading lowers the risk; it doesn't prove a skill is safe. It can miss tricks built at run time, such
as a command put together from pieces. Run skills you don't trust in a sandbox, and audit again on every update.

## Antivirus note

`references/checklist.md` lists what malware looks like, so the audit can search for it. Nothing in it runs, but
some antivirus tools may flag it. An earlier version kept these patterns in a Python script, and Bitdefender
quarantined it within a minute, so this version has no script. If a file is flagged, read it, and report the false
positive to your antivirus maker.

## Tip: turn off commands that run when a skill loads

A line in a skill can run a command the moment you start it, without a prompt. If you don't need that, add this
line inside the braces of `~/.claude/settings.json`, next to your other settings:

```json
"disableSkillShellExecution": true
```

## License

MIT, see [LICENSE](LICENSE).
