# AI Life Assistant — UI Screenshots

Captured from the live app (Vite web client on :5180 + Express/Socket.io API on :3000,
Postgres + pgvector, Redis) with Playwright/Chromium. All data below was created through
the real API and the real AI agent — nothing is mocked.

## desktop/ — 1600×1000 @2x (3200×2000 px)
| File | Screen |
|---|---|
| 01-login.png | Landing / sign-in hero — voice-first pitch, brand gradient |
| 02-register.png | Account creation |
| 03-home.png | Authenticated home — greeting, voice orb, quick actions |
| 04-chat.png | AI chat — real conversation, agent created a task from natural language, live "Today" panel |
| 05-tasks.png | Tasks — all four states (pending / in progress / completed), priority chips, filter tabs |
| 06-notes.png | Notes — semantic-memory items flagged "In AI Context" |
| 07-settings.png | Settings |

## mobile/ — 390×844 @3x (1170×2532 px, iPhone-class)
| File | Screen |
|---|---|
| 01-login.png | Landing / sign-in |
| 02-home.png | Home with bottom tab bar |
| 03-chat-empty.png | Chat empty state — suggestion cards |
| 03-chat.png | Chat with a live conversation — the agent creating a task from plain language |
| 04-tasks.png | Tasks |
| 05-notes.png | Notes |
| 06-settings.png | Settings |

## Suggested portfolio thumbnail
`desktop/04-chat.png` — it shows the whole product in one frame: sidebar nav, an AI
conversation that actually performed an action, and the live Today sidebar.
Runner-up: `desktop/01-login.png` for a pure brand shot.

Demo account: demo@ailife.app
