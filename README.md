# Claude skills

Free, open source skills for [Claude](https://claude.ai).

| Skill | Version | What it does |
|---|---|---|
| [yt-notes](yt-notes/) | 3.1.0 | Turns a YouTube video, a 2+ hour talk or a whole playlist into short, visual study-guide PDFs |
| [skill-audit](skill-audit/) | 1.0.0 | Checks a skill or plugin for security risks before you install it |

**What these skills don't do:** no hooks, no MCP servers, no telemetry, and nothing runs when a session starts.
yt-notes asks before it installs anything or opens a web page; skill-audit never runs anything from the skill
it checks. Each release is audited with skill-audit itself.

**Found with skill-audit:** a gap in Microsoft's official azure-cost plugin, which Microsoft fixed two days after
we reported it. [The story](https://blueaisecurity.com/microsoft-ai-plugin-gap).

## Get a skill

Use a release, not the newest commit: a release is a version we have tested and audited. The newest is on the
[Releases](https://github.com/blueaisecurity/claude-skills/releases) page, and what changed is in the
[CHANGELOG](CHANGELOG.md).

```bash
git clone --depth 1 --branch v1.0.0 https://github.com/blueaisecurity/claude-skills.git
```

Then copy the skill's folder to `~/.claude/skills/`. For the Claude apps, delete the `argument-hint` and
`disable-model-invocation` lines from `SKILL.md` first: the upload accepts no other fields.

To update, run `/skill-audit` on the new version before you replace your copy.

## Use it

```
/yt-notes <video-or-playlist-link>
/skill-audit <skill folder, GitHub link or zip>
```

Options and examples are in each skill's README: [yt-notes](yt-notes/README.md) and
[skill-audit](skill-audit/README.md).

## Report a problem

Security problems: please report them privately, as described in [SECURITY.md](SECURITY.md). Everything else:
open an issue.

## Read more

- [I Built a Claude Skill to Summarize YouTube. So Did the Attackers.](https://blueaisecurity.com/claude-skill-security)
- [I Built a Free Tool to Check Claude Skills. It Found a Gap in a Microsoft AI Plugin.](https://blueaisecurity.com/microsoft-ai-plugin-gap)

## License

MIT, see [LICENSE](LICENSE).
