# Security

RoboDad is a free chatbot for teens, so we take safety and security seriously.

## Reporting a problem

If you find a security issue (a way to break the site, get around the safety
rules, or reach data you shouldn't), please **don't post it publicly**.
Email **dad@robodad.app** with "RoboDad security" in the subject
and the steps to reproduce it. You'll get a reply within a few days.

Please don't test against the live site in ways that slow it down for others
(load testing, mass sign-ups or floods of messages). Running your own copy
locally is easy: see the README.

## What's in place

- No secrets in this repository. API keys live only in the hosting provider's
  environment settings, are never sent to the browser, and are redacted from logs.
- Chats are not stored on the server.
- Per-visitor and daily rate limits, request size limits and input length limits.
- Strict security headers, including a Content-Security-Policy that blocks
  injected scripts and stops the site being framed by other sites.
- Crisis messages are answered with fixed, human-written help messages and
  never depend on the AI (`app/safety.py`, tested by `scripts/test_safety.py`).
- Weekly automated checks for vulnerable dependencies and leaked secrets.
