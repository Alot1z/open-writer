# Security Policy

---

## Reporting a Vulnerability

If you discover a security vulnerability in Open Writer, please report it responsibly.

**Do not** open a public GitHub issue for security vulnerabilities.

Instead, report vulnerabilities by:

1. **Email**: Send a detailed report to the project maintainers via GitHub's security advisory feature
2. **GitHub Security Advisory**: Use the [Security Advisories](https://github.com/open-writer/open-writer/security/advisories) page to privately report a vulnerability

Please include the following in your report:

- A clear description of the vulnerability
- Steps to reproduce the issue
- The potential impact of the vulnerability
- Any suggested mitigations or fixes

We will acknowledge your report within 72 hours and provide a status update within 7 days.

---

## Security Principles

### Local-First Architecture

Open Writer is designed as a local-first application. This has fundamental security implications:

- **Data stays on your machine** -- All writing data is stored in a local SQLite database
- **No cloud sync** -- There is no built-in cloud synchronization that could expose your data
- **No account required** -- The application works fully offline without any account or authentication
- **No telemetry** -- Open Writer does not collect, transmit, or share any usage data
- **No tracking** -- There are no analytics, tracking pixels, or user behavior monitoring
- **No third-party data sharing** -- Your writing data is never shared with any third party

### AI Features

AI-powered features are strictly opt-in:

- **Explicit activation** -- AI features only make network requests when you explicitly invoke them
- **Provider isolation** -- AI providers receive only the text you explicitly send, not your full database
- **No persistent storage** -- AI providers do not store your data beyond the request lifecycle (subject to each provider's own policies)
- **User control** -- You can disable AI features entirely in settings

### Network Activity

Open Writer makes network requests only in these specific circumstances:

1. **AI assistant** -- When you explicitly request AI suggestions or analysis
2. **AI agent** -- When you explicitly run an agent task
3. **Image search** -- When you explicitly search for images

All other functionality works entirely offline. No background network activity occurs.

---

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | Active development |

Open Writer is currently in early development (pre-1.0). Security fixes will be applied to the latest development version. Once a stable 1.0 release is published, we will define a formal support window for each major version.

---

## Security Best Practices for Contributors

Contributors should follow these practices:

- Never introduce dependencies that collect user data or telemetry
- Never add background network requests without clear user consent
- Never store sensitive data (API keys, tokens) in plain text or client-side code
- Always validate and sanitize user input on both client and server
- Follow the principle of least privilege for all API routes
- Report any security concerns discovered during development
