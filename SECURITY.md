# Security

## Report a security problem

If you find a security problem in yt-notes or skill-audit, please report it privately: open the **Security** tab
of this repo and choose **Report a vulnerability**. That sends it only to us, through GitHub. Please don't open a
public issue for it.

Tell us which skill and which version (the `metadata.version` line in its `SKILL.md`), what you found, and how to
see it. We aim to reply within a week, and we'll tell you what we plan to do and when.

A skill that misses an attack it should catch, or a verdict that is too generous, counts too: for skill-audit,
that is a security problem, not just a bug.

Problems in Claude Code or the Claude apps themselves aren't ours to fix: please report those to Anthropic.

## Which versions

We fix the newest release. Releases are listed on the
[Releases](https://github.com/blueaisecurity/claude-skills/releases) page, and what changed is in
[CHANGELOG.md](CHANGELOG.md).

## What we check before each release

- Each skill is audited with skill-audit in deep mode. The result is in the skill's README.
- Every file is read for names, addresses, paths and keys, and scanned with gitleaks.
- No skill in this repo has hooks, MCP servers or telemetry, or runs anything when a session starts.
