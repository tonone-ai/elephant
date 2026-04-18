# Security Policy

## Supported Versions

Only the latest commit on `main` is supported. Older tags are not patched.

| Version         | Supported |
| --------------- | --------- |
| `main` (latest) | Yes       |
| Older tags      | No        |

## Reporting a Vulnerability

Please report suspected vulnerabilities privately. **Do not open a public GitHub issue for security reports.**

Email: **security@tonone.ai**

Include:

- A description of the issue
- Steps to reproduce
- Affected files or commands
- Your assessment of impact

## Response Timeline

- **Acknowledgement:** within 72 hours of receipt.
- **Initial assessment:** within 7 days.
- **Fix or mitigation:** target 30 days for confirmed issues, sooner for high-severity.

## Scope

**In scope:**

- The `elephant` skill logic (`skills/elephant/SKILL.md`)
- The install script (`install.sh`)
- Hooks shipped in this repository
- The plugin manifest (`.claude-plugin/plugin.json`)

**Out of scope:**

- Claude Code itself (report to Anthropic)
- User-local files outside this plugin
- Third-party plugins or skills

## Disclosure

We prefer coordinated disclosure. Once a fix is released, we will credit the reporter unless anonymity is requested.
