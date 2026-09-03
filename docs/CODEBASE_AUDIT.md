# 🧠 Senior Engineering Codebase Audit Report

**Project:** AI Life Assistant (monorepo — `apps/server`, `apps/web`, `apps/mobile`, `packages/shared`)
**Reviewed:** 3 September 2026
**Scope:** ~13,900 lines of TypeScript across 174 source files
**Reviewer stance:** Pre-hire / pre-promotion technical review

---

## 1️⃣ Executive Summary

This is a **genuinely above-average codebase that is undermined by a verification gap**, not by a skills gap.

The structural instincts here are strong and, in places, senior. The server is a properly layered modular monolith — `routes → controller → service → repository` — applied consistently across all five domain modules with no leakage. Environment config is Zod-validated and fails fast. The Dockerfile is multi-stage with a non-root user and a healthcheck. Health endpoints are split into Kubernetes liveness/readiness probes with a written rationale for why. Rate limiting is Redis-backed and deliberately fails open. Socket.io handshakes are authenticated and users are placed in private rooms. pgvector search runs behind an HNSW index. `strict: true` is on in all four workspaces, and **typecheck and lint both pass clean across the entire monorepo** — I ran them.

That is not junior work. Someone here understands how production systems are operated, not just how features are built.

**And then there is the other half.** The single most serious finding in this review is not a bug — it is a *pattern*: **this codebase documents security properties it does not implement.** In three separate files, comments assert refresh-token hashing and family-based rotation with theft detection. None of it exists. `jwt.ts:22` claims "Refresh tokens stored as bcrypt hashes in DB (never raw)". `users.ts:56` claims "The tokenHash stores bcrypt hash of the token — never store raw tokens." The actual line is `auth.service.ts:196`: `tokenHash: refreshToken, // In production, bcrypt this`. Raw, plaintext, in a column named `tokenHash`.

For a reviewer, that is worse than an unimplemented feature. An unimplemented feature is visible. A comment that lies about a security control is *invisible* — it actively stops the next engineer from looking. Three-quarters of the refresh-token repository (`findRefreshTokenByFamily`, `revokeRefreshToken`, `revokeTokenFamily`) is dead code that exists purely to make the documented design look implemented.

Add to that: **one test in the entire repository** (a render smoke test), **`npm test` in the server exits with code 1 because no test files exist**, **no CI/CD of any kind**, and **two confirmed data-corruption bugs in the chat flow** that no test would have caught because there are no tests.

**Developer level: strong mid-level, actively transitioning to senior — call it Mid-II / L4.**

The infrastructure reasoning is senior-tier. The *verification discipline* is not, and that is precisely the line between mid and senior. A senior engineer's defining habit is not writing better code — it is not trusting their own code until something external confirms it. Every finding below is downstream of that one missing habit.

**Would this pass a real company code review?**

**No — not as a single PR, and not for production.** It would be blocked on the auth module alone. But this is a *reviewable* codebase, not a rewrite candidate: the failures are localized and named, the architecture underneath is sound, and every issue in this report is a bounded fix. In most teams this comes back approved within a sprint. That is a meaningfully different verdict from "this needs to be thrown away," and it should be read that way.

---

## 2️⃣ Project Scorecard

| Category | Score (/10) | Notes |
|----------------------|-------------|-------|
| Folder Structure | **8** | Feature-based clients, layered server, clean monorepo boundaries. Loses points for an underused `shared` package and web/mobile drift. |
| Clean Code | **6** | Server is disciplined and consistent. Dragged down by ~40% client duplication, dead code, and repetitive log-and-rethrow blocks. |
| Readability | **8** | Best attribute. Comments explain *why*, not *what*. Undercut by naming drift (`taskService`/`tasksService`, `notes`/`knowledge`). |
| Maintainability | **5** | Every client feature must be built twice, in two different paradigms, with zero test coverage to catch drift. |
| Scalability | **6** | Right primitives (Redis, HNSW, stateless JWT, k8s probes). Socket Redis adapter documented but never wired; no socket-level rate limit. |
| Architecture | **7** | Server architecture is genuinely good. Client architecture diverged into two incompatible designs. |
| Reusability | **5** | UI primitives are well-factored per-platform. Cross-platform logic reuse is near zero despite a monorepo built for exactly that. |
| Production Readiness | **4** | No CI, ~0% test coverage, no error boundaries, no crash reporting, plaintext refresh tokens, two live data bugs. |

```
Final Verdict Score: 6.1/10
Hire Recommendation: MAYBE — YES for a mid-level role, NO for senior
```

**Read that verdict carefully.** A 6.1 with clean typecheck, clean lint, a coherent architecture, and thoughtful infrastructure is a fundamentally different 6.1 from a codebase that scores 6.1 by being mediocre everywhere. This one is spiky: 8s where design thinking shows, 4s where verification should have. Spiky profiles are far more promotable than flat ones, because the low scores have a single shared root cause and therefore a single fix.

---

## 3️⃣ Folder Structure Review

### Strengths

- **Server layering is textbook and, crucially, consistent.** Five modules (`auth`, `chat`, `knowledge`, `tasks`, `voice`), each with the same `*.routes.ts / *.controller.ts / *.service.ts / *.repository.ts / *.validation.ts` quintet. I checked for leakage — controllers do not touch Drizzle, repositories do not throw HTTP errors. That consistency is worth more than any individual clever file.
- **`infrastructure/` vs `modules/` vs `shared/` is a real boundary**, not a naming exercise. DB clients, Redis, and Socket.io setup live in `infrastructure/`; business logic never reaches into them directly.
- **Path aliases everywhere** (`@config`, `@modules/*`, `@components/*`). Zero `../../../` imports in the entire repo. This is a small thing that pays off constantly.
- **Feature-first on both clients** — `features/{auth,chat,home,knowledge,settings,tasks,voice}` on mobile and web, with matching folder names across platforms.
- **Mobile co-locates by feature properly**: `features/chat/{components,hooks,screens,services,stores}`. This is the structure that survives a team growing past four people.
- **`.env` is correctly gitignored and has never been committed** — I checked the full git history. `.env.example` is key-for-key identical to `.env`. Credit where due; this is the single most common failure in projects at this stage and it was handled correctly.

### Problems

- **`packages/shared` is 242 lines of types and constants — and nothing else.** In a monorepo containing two TypeScript clients that speak an identical REST + Socket.io protocol, the shared package contains no API client, no socket wrapper, no auth store, no service layer. The one piece of infrastructure explicitly built for reuse is the one piece carrying almost no weight.
- **Web and mobile organize the same features differently.** Mobile: `features/tasks/services/taskService.ts`. Web: `services/api/tasksService.ts`. Same domain, same endpoints, two locations, two names.
- **Three names for one domain.** Server module `knowledge` → mobile `knowledgeService` → web `notesService`. The database table is `knowledge_items`; the web UI calls them Notes. Domain language should be decided once and enforced everywhere.
- **No `docs/`, no root README.** The only README is React Native's generated boilerplate at `apps/mobile/README.md`. A new engineer cloning this repo has no entry point — no setup steps, no architecture note, no "run these four commands." Given the non-obvious local setup (Homebrew Postgres, pgvector compiled from source, `adb reverse` for Android), this is a genuine onboarding blocker.
- **No `.github/` directory at all** — covered in §7.
- **Dead files ship with the repo**: `apps/mobile/src/features/voice/stores/voiceStore.ts` and `apps/mobile/src/assets/index.ts` have zero importers. `@react-native-voice/voice` sits in `package.json` dependencies but appears *only inside a comment* — it is a native module adding build weight and permission prompts for nothing.

### Suggested Improved Structure

The single highest-leverage change is promoting the duplicated client runtime into `packages/`:

```
AI-Life-Assistant/
├── README.md                       # ← MISSING: setup, architecture, run commands
├── .github/workflows/ci.yml        # ← MISSING: typecheck + lint + test on every PR
├── docs/
│   ├── ARCHITECTURE.md
│   └── CODEBASE_AUDIT.md
│
├── packages/
│   ├── shared/                     # types + constants (as today)
│   ├── api-client/                 # ← NEW: axios instance, ONE 401-refresh impl,
│   │   ├── src/client.ts           #   error normalisation, service modules
│   │   ├── src/services/{auth,tasks,knowledge,chat}.ts
│   │   └── src/storage.ts          #   storage port — adapters injected per platform
│   └── core/                       # ← NEW: platform-agnostic logic
│       ├── src/stores/authStore.ts #   one auth store, both platforms
│       └── src/chat/               #   socket protocol + streaming reducer
│
├── apps/
│   ├── server/                     # unchanged — this layer is already right
│   │   └── src/modules/<domain>/   # + <domain>.service.test.ts  ← MISSING
│   ├── web/src/
│   │   ├── features/<domain>/      # UI only; data via @ai-life/api-client
│   │   └── components/ui/
│   └── mobile/src/
│       ├── features/<domain>/      # UI only; same hooks as web
│       └── components/ui/
```

The rule that makes this hold: **`packages/` owns everything that is not a pixel.** If a file has no JSX and no platform API, it does not belong in `apps/`.

---

## 4️⃣ Clean Code Review

### What's Good

- **Comments explain reasoning, not mechanics.** This is rare and it is the strongest signal in the entire codebase. From `gemini.service.ts:36-40`:

  > `gemini-embedding-001` natively outputs 3072 dims; we ask for 1536 via Matryoshka truncation so existing rows and the pgvector column keep working.

  And `gemini.service.ts:63-66`, on a detail most developers miss entirely:

  > Gemini only guarantees unit-length vectors at the full 3072 dims; truncated outputs (like our 1536) are not normalized. Cosine distance itself is scale-invariant, but normalizing keeps stored vectors consistent.

  That is a senior engineer writing for the person who arrives in six months.

- **`app.ts:18-28` numbers the middleware chain and explains why the order is load-bearing.** `server.ts:17-21` justifies sharing a port between HTTP and Socket.io in terms of load-balancer rules and TLS certs — operational reasoning, not code reasoning.
- **Deliberate failure modes.** `app.ts:66-70` documents `passOnStoreError: true` and explains that a Redis outage should degrade rate limiting rather than take down the API. `safeEmbedText` returns `null` so chat survives an embeddings outage without RAG. Someone thought about what happens at 3am.
- **Consistently thin controllers.** Extract → call service → send response. No business logic leaked upward anywhere in five modules.
- **Only 6 `console.*` calls and 5 explicit `any`s in ~13,900 lines**, with structured Pino logging on the server. That is genuinely disciplined.
- **Accessibility was not skipped** — 86 `accessibilityLabel`/`accessibilityRole` attributes on mobile, 68 `aria-*`/`role=` on web. Most projects at this stage have zero.

### Code Smells

**1. Comments that contradict the code (critical).** Covered in §9-1. Three files assert refresh-token security that does not exist.

**2. The same problem solved twice, differently, in the same repo.** The 401-refresh interceptor:

- `apps/mobile/src/services/api/client.ts:52-118` — legacy `isRefreshing` + `failedQueue` + `processQueue` pattern, ~70 lines.
- `apps/web/src/services/api/client.ts:22-52` — modern single-flight `refreshPromise ??=` pattern, ~20 lines.

Identical requirement. One is clearly better. Neither is shared. And they have already drifted in a way that will bite: `setTokens(accessToken, refreshToken)` on mobile takes two arguments, `setTokens(tokens)` on web takes one object. A developer moving between the two apps will write the wrong call and TypeScript will catch it — but only because the shapes differ enough. Semantic drift will not be caught.

**3. `taskService` vs `tasksService` — same endpoints, different type discipline.** Mobile uses a proper `ApiWrapper<T>` generic. Web uses `as Task[]` casts, which silently defeat type safety at exactly the trust boundary where you need it most. Worse, mobile *re-declares* the request shapes inline instead of importing `CreateTaskRequest` / `UpdateTaskRequest` — which already exist in `packages/shared/src/types/task.ts` and are already imported elsewhere in that same app.

**4. Log-and-rethrow boilerplate.** Every method in `auth.service.ts` wraps its body in:

```ts
} catch (error) {
  if (!(error instanceof AppError)) {
    logger.error({ msg: '...', err: error });
  }
  throw error;
}
```

Five near-identical blocks, ~30 lines, in a 212-line file. The `errorHandler` middleware already logs unhandled errors with full context. This is defensive duplication that adds noise and creates double log lines.

**5. Inconsistent formatting within a single layer.** `auth.controller.ts` uses multi-line catch blocks (and uniquely calls `logger.error` in `register` but nowhere else — an inconsistency inside an inconsistency). `tasks.controller.ts` uses `catch (error) { next(error); }` on one line. Same layer, same repo. Prettier is configured for mobile only.

**6. Unreachable defensive code that looks like security.** `chat.service.ts:11-13`:

```ts
const conv = await chatRepository.findConversationById(conversationId, userId);
if (!conv) throw new NotFoundError('Conversation');
if (conv.userId !== userId) throw new ForbiddenError();   // ← can never fire
```

`findConversationById` already filters `WHERE user_id = userId`. The `ForbiddenError` branch is dead — and `chat.gateway.ts:110-117` carries a whole error-handling arm for a condition that cannot occur. This reads as an authorization check while providing no authorization.

**7. Ref mutation during render.** `ChatScreen.tsx:78` — `sendRef.current = sendMessage;` executes in the render body. It works today, but it is not safe under concurrent rendering and will break subtly if React ever re-renders without committing. Belongs in an effect.

**8. Collision-prone ID generation.** `chatStore.ts` (web) keys optimistic messages as `` `local-${s.messages.length}-${content.length}` ``. Two messages of equal length at the same index collide, and React will reconcile them as the same node. `crypto.randomUUID()` costs nothing.

**9. O(n²) token accumulation.** Web's `appendToken` copies the whole message array per streamed token. At a few hundred tokens across a long conversation this is measurable jank on low-end devices.

**10. Magic numbers without named constants.** `4_000` (message cap, `chat.gateway.ts:49`), `20` (history depth), `3` (RAG top-K), `0.70` (similarity threshold), `900` (fallback token TTL). Several already have homes in `packages/shared/src/constants/index.ts` — `CHAT.MAX_CONTEXT_MESSAGES` is defined as `20` and then hardcoded as `20` at the call site.

### How to Improve

1. Delete every misleading comment **today** — before any refactor. A wrong comment is worse than no comment.
2. Promote the web `refreshPromise` interceptor into `packages/api-client` and delete the mobile one.
3. Delete the five log-and-rethrow blocks; let `errorHandler` do its job.
4. Delete the dead `ForbiddenError` branches and the three unused repository methods, or implement the design they imply (§9-1).
5. Add Prettier + `eslint-config-prettier` at the root, run once across all workspaces.
6. Replace magic numbers with the constants that already exist in `packages/shared`.

---

## 5️⃣ Readability Review

**Score: 8/10 — the strongest dimension of this codebase.**

Reading unfamiliar code here is genuinely pleasant. Files are short (median well under 150 lines; only one file exceeds 300). Functions do one thing. Control flow is flat — guard clauses instead of nested conditionals, throughout.

The comment quality is the standout. Most codebases at this level either have no comments or restate the code (`// increment the counter`). This one explains *tradeoffs*: why Zustand over Redux, why bcrypt over argon2 (with the cost of that choice acknowledged), why Socket.io shares the HTTP port, why task extraction runs post-stream instead of as a mid-stream tool call. A reviewer can reconstruct the author's reasoning without a meeting — that is the actual purpose of comments and it is achieved here.

**What costs it the last two points:**

- **Domain vocabulary is not settled.** `knowledge` (server) / `knowledgeService` (mobile) / `notesService` + `NotesPage` (web) / `knowledge_items` (database) — four labels for one concept. A reader has to hold a translation table.
- **Singular/plural drift**: `taskService` vs `tasksService`, `tasksStore` vs `notesStore`.
- **`_generateTokenPair` signals private but is publicly reachable** on an exported object literal. The convention promises an encapsulation TypeScript is not enforcing.
- **`ChatScreen.tsx` at 482 lines is the one genuinely hard file** — it juggles sidebar state, voice state, autospeak, streaming, conversation selection, and layout breakpoints in a single component. Everything else in the repo is easy to read; this file is the exception that proves the rule.
- **`getMessages` returns `rows.reverse()`** after a `DESC` query — correct for page 1, subtly wrong for page 2+. Reverse-chronological pagination that is re-reversed per page is a well-known trap and deserves either a comment or a fix.

---

## 6️⃣ Maintainability Review

**Score: 5/10.** This is where the codebase pays for the verification gap.

**How easy is it to add a feature?** On the server, easy — copy an existing module, get five files with obvious responsibilities. The pattern is clear enough that a new hire would produce correct-shaped code on day one.

**On the clients, every feature costs double.** Adding "recurring tasks" means writing it in `apps/mobile` with Zustand and again in `apps/web` with React Query — different data-fetching model, different cache invalidation, different loading-state conventions. Not a port; a reimplementation. The two `useChat` hooks already demonstrate the outcome: mobile's handles history hydration, reconnect-on-401, and loading states; web's does none of that. Web's even calls `disconnectSocket()` on unmount while mobile's deliberately does not — meaning a second component mounting `useChat` on web would tear down the shared socket for the first. **They have already diverged in behaviour, not just in style.**

**Risk of breaking things: high, and undetectable.**

| Signal | Reality |
|---|---|
| Test files | **1** (`App.test.tsx` — asserts the app renders) |
| Server test suite | **Exits code 1 — "No test files found"** |
| Web test infrastructure | **None** — no `test` script in `package.json` |
| CI/CD | **None** — no `.github/` directory |
| Error boundaries | **Zero** across both clients |
| Crash reporting | **None** — `logger.ts:3` says "In production, replace with Sentry" |

For ~13,900 lines including auth, payments-grade token handling, streaming, and vector search, one render smoke test is effectively zero coverage. There is nothing standing between a refactor and a production incident. The two data bugs in §9 are the proof: both are trivially catchable by a single integration test, and both are live.

**Testability of the code itself is good — which makes the absence more frustrating.** The repository pattern means services can be tested against a mocked repo with no database. `auth.service.ts` is pure logic over an injectable boundary. The architecture was *built* for testing and then never tested. One structural obstacle: `config/env.ts:80` calls `process.exit(1)` at module import time, so importing anything that transitively imports `@config` will kill a test runner without a valid `.env`. That needs to become a throw.

**Coupling** is otherwise well-managed — no circular dependencies, `packages/shared` correctly holds zero platform imports, and `infrastructure/` is not reached into from business logic.

---

## 7️⃣ Scalability Review

**Score: 6/10.** The infrastructure instincts are real; the follow-through is partial.

### Can this reach 100k users?

**Already correct:**
- Stateless JWT auth — API instances scale horizontally without sticky sessions.
- Redis-backed rate limiting shares state across instances (a genuinely common thing to get wrong).
- Connection pooling is configurable (`DATABASE_POOL_MIN/MAX`).
- HNSW index on embeddings keeps vector search at O(log n) instead of a sequential scan.
- Graceful shutdown with a 10s timeout — no dropped requests during a rolling deploy.
- k8s liveness/readiness split, correctly reasoned: DB down → stop routing traffic, but don't restart the container.
- Multi-stage Docker build, non-root user, healthcheck.

### Bottlenecks

**1. Socket.io is single-instance today.** `socket/server.ts:20-23` documents the fix and does not apply it:

> Scaling to multi-instance: add the Redis adapter: `io.adapter(createAdapter(pubClient, subClient));`

Without it, `io.to(userId).emit()` only reaches sockets on the *same* Node process. The moment a second instance exists, AI-extracted task notifications silently fail for a fraction of users — with no error anywhere. This is the highest-severity scaling issue because it fails *silently* and only under load.

**2. WebSocket chat has no rate limiting whatsoever.** `express-rate-limit` guards REST, but `chat:message` arrives over an established socket and never touches Express middleware. A single authenticated client can emit unbounded messages, each triggering a Gemini streaming call plus a follow-up Flash-Lite extraction call. **This is an uncapped billing liability, not just a load concern** — the cheapest possible attack against this app is a `for` loop.

**3. The refresh-token table grows without bound.** Every login and every refresh inserts a row; nothing revokes, expires, or prunes. `expiresAt` is written and never read. At 100k users this becomes tens of millions of dead rows on the auth hot path.

**4. `updateConversationStats` recounts on every message.** `messageCount: db.$count(messages, eq(messages.conversationId, id))` runs a `COUNT(*)` subquery per turn. Fine at current scale, linear-growth work on a conversation's hot path — an atomic increment is the standard fix.

**5. Base64 WAV audio over JSON.** `voice.controller.ts` acknowledges this ("for long audio, revisit with chunked transfer"). Base64 inflates payloads ~33% and WAV is uncompressed; combined with `express.json({ limit: '10mb' })` this will hit ceilings quickly.

**6. Unbounded in-memory response accumulation.** `streamChat` builds `fullText` in memory per concurrent stream. Fine at hundreds of concurrent chats, a memory-pressure question at thousands.

### Can multiple developers work on it?

**Server: yes.** Module boundaries are clean enough that two engineers in `auth` and `tasks` will not collide.

**Clients: not comfortably.** With no CI, no tests, and mandatory double-implementation of every feature, a second developer roughly doubles integration risk. The first hire on this codebase should not write features — they should write the CI pipeline and the test harness.

### Tech debt risks, ranked by cost-to-fix-later

1. Client duplication — grows linearly with every feature shipped; cheapest to fix *now*.
2. Zero test coverage — cost compounds; every untested week makes the first test harder to write.
3. Auth token model — a rewrite of `refreshTokens` semantics after launch is a forced logout for every user.
4. Missing Socket.io Redis adapter — cheap now, an incident later.

---

## 8️⃣ Architecture Review

### What it currently is

**Server: a Layered Modular Monolith — and a well-executed one.**

```
HTTP Request
   ↓ routes/         URL → handler, validation middleware attached
   ↓ controller/     HTTP in, HTTP out. No business logic.
   ↓ service/        Business rules. No SQL, no req/res.
   ↓ repository/     Drizzle queries. No HTTP awareness.
   ↓ infrastructure/ DB pool, Redis, Socket.io
```

This is a clean Ports-and-Adapters-influenced layering, and the layering is *actually respected* — I checked for violations and found none. Cross-cutting concerns (`errors/`, `utils/`, `services/`) sit in `shared/`. Domain modules never import each other's repositories, only their services (`chat.service` → `knowledge.service`). That is the correct coupling direction.

For a solo-to-small-team product at this stage, a modular monolith is the right call, and the module boundaries are drawn such that extracting `voice` or `knowledge` into a service later would be mechanical rather than archaeological. That is good architecture: it doesn't over-engineer for scale it doesn't have, while leaving the seams where they'd be needed.

**Clients: Feature-Sliced — but two incompatible dialects of it.**

| | Mobile | Web |
|---|---|---|
| Server state | Zustand (hand-rolled) | TanStack Query |
| Client state | Zustand | Zustand |
| Stores | 5 | 2 |
| Data hooks | Manual `useEffect` + store | `useQuery`/`useMutation` |
| Chat history hydration | Yes | No |
| Socket teardown | Never disconnects | Disconnects on unmount |

Both are defensible designs. **Holding both simultaneously is not.** Web's React Query adoption is the better choice — it gets caching, deduplication, retries, and invalidation for free, which is exactly the machinery mobile is reimplementing by hand in `useChat`. The problem is that the migration stopped halfway, leaving the monorepo with two mental models for one product.

**Verdict: not spaghetti. Not yet fully coherent either.** The server would pass architectural review at most companies. The client layer is a half-completed migration that needs to be finished in one direction.

### Suggested Architecture

Keep the server as-is. Unify the clients around a shared core:

```
┌─────────────────────────────────────────────────────────┐
│  apps/web (React)          apps/mobile (React Native)   │
│  ── pixels only ──         ── pixels only ──            │
│  components/ui/            components/ui/               │
│  features/*/Page.tsx       features/*/Screen.tsx        │
└────────────┬───────────────────────────┬────────────────┘
             │      same hooks, same     │
             │      cache, same types    │
┌────────────┴───────────────────────────┴────────────────┐
│  packages/core                                          │
│   • TanStack Query hooks: useTasks, useNotes, useChat   │
│   • authStore (Zustand) — one implementation            │
│   • socket protocol client + streaming reducer          │
│   • storage port ← keychain (mobile) / localStorage (web)│
├─────────────────────────────────────────────────────────┤
│  packages/api-client   ── one axios instance,           │
│                           ONE 401-refresh interceptor   │
├─────────────────────────────────────────────────────────┤
│  packages/shared       ── types, constants, Zod schemas │
└─────────────────────────────────────────────────────────┘
```

React Query runs unmodified in React Native — this migration is well-trodden. The platform-specific surface reduces to storage (keychain vs localStorage) and navigation, both injectable behind a small port.

**Expected outcome: ~40% less client code, one behaviour to test instead of two, and feature parity by construction rather than by discipline.**

---

## 9️⃣ Top 10 Critical Improvements

Ordered by *risk × blast radius*, the way a tech lead would sequence them.

### 1. Fix the auth token model — and delete every comment that lies about it 🔴

**Severity: Critical. Do this before anything else.**

Three files claim security controls that do not exist:

| Location | The claim | The reality |
|---|---|---|
| `jwt.ts:22` | "Refresh tokens stored as bcrypt hashes in DB (never raw)" | Stored raw |
| `users.ts:56` | "The tokenHash stores bcrypt hash — never store raw tokens" | Stores the raw token |
| `auth.service.ts:19-26` | Family rotation with reuse detection + family revocation | Not implemented |

The actual code, `auth.service.ts:196`:

```ts
tokenHash: refreshToken,   // In production, bcrypt this
```

Three consequences, each independently serious:

1. **Read access to the database is full account takeover for every user simultaneously.** A SQL injection, a leaked backup, or an over-permissioned analytics role hands over live credentials — not hashes.
2. **`refreshTokens()` never consults the database.** It verifies the JWT signature, loads the user, and mints a new pair. It never checks whether the token was revoked. **Therefore `logout()` does not log anyone out.** It writes `revokedAt` to rows that the refresh path does not read. A stolen refresh token stays valid for its full 7-day life, and the user has no way to kill it.
3. **The documented family-rotation design is entirely dead code.** `findRefreshTokenByFamily`, `revokeRefreshToken`, and `revokeTokenFamily` have zero call sites. `auth.service.ts:143` even admits it inline: *"same family concept but new family for simplicity."*

**Fix:** store `sha256(token)` (fast, sufficient for high-entropy JWTs — bcrypt is unnecessary here and the comment is wrong on that point too); look the hash up on every refresh; reject revoked tokens and revoke the whole family on reuse; revoke the presented token when issuing its replacement. Then make `logout` actually terminate sessions. **And delete the three comments the moment you start** — if the fix slips, the next reader must not be misled again.

### 2. Fix the duplicate assistant message rows 🔴

**Severity: Critical — silent, ongoing data corruption.** Confirmed: three `createMessage` calls, zero content updates.

`chat.service.ts:69` inserts an **empty** assistant message and sends its ID to the client as `assistantMessageId`. `chat.service.ts:104` then inserts a **second** assistant message with the real text. The placeholder is never updated and never deleted.

Consequences:
- Every assistant turn permanently writes a blank row. Reload a conversation and you get an empty bubble before every real reply.
- The ID the client uses to key the streaming bubble points at a row that stays empty forever.
- `getRecentMessages` feeds those blanks back into the LLM context on every subsequent turn — burning tokens and degrading response quality as the conversation grows.

The repository has `updateMessageTokenCount` (never called) but no `updateMessageContent` — the method needed to do this correctly was never written. That is the tell that this flow was never run end-to-end against the database.

**Fix:** add `updateMessageContent(id, content, tokenCount)` and have `onDone` update the placeholder instead of inserting. Then write the migration to delete existing empty assistant rows.

### 3. Fix conversation titles never persisting 🔴

**Severity: High — user-visible, and it has already misled the client team.**

`chat.service.ts:58-60`:

```ts
const title = content.length > 60 ? `${content.slice(0, 57)}...` : content;
await chatRepository.updateConversationStats(conversation.id);
conversation.title = title;      // ← in-memory only; never written to the DB
```

`updateConversationStats` sets `messageCount`, `lastMessageAt`, `updatedAt` — never `title`. **Every conversation stays "New conversation" in the database forever.** The sidebar shows an undifferentiated list.

The revealing part: `ChatScreen.tsx:85` states the client's belief —

> a first reply both creates the conversation and (server-side) auto-generates its title.

The client is coded against server behaviour that does not exist. This is the same failure mode as finding #1, crossing the client/server boundary. **Fix:** pass `title` into an `updateConversation` call.

### 4. Set up CI — nothing else sticks without it 🔴

There is no `.github/` directory. Every quality gate in this repo is currently a habit rather than a rule.

`typecheck` and `lint` **already pass clean across all four workspaces** — that is a working gate nobody is enforcing. Wire it up on day one:

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build -w packages/shared
      - run: npm run typecheck --workspaces --if-present
      - run: npm run lint --workspaces --if-present
      - run: npm test --workspaces --if-present
```

Add branch protection. This is a 20-minute task that permanently changes the codebase's trajectory.

### 5. Write the first 20 tests 🔴

Current state: **1 test in ~13,900 lines**, and `npm test -w apps/server` **fails with exit code 1** because `vitest.config.mts` was configured and no test was ever written.

Findings #1, #2, and #3 are all caught by a single integration test that sends one chat message and asserts the resulting database rows. That is the entire argument for testing, demonstrated on your own codebase.

Highest-value first:
1. `auth.service` — register / login / refresh / **logout actually revokes** (locks in #1)
2. `chat.service.streamResponse` — asserts exactly 2 rows per turn and a persisted title (locks in #2, #3)
3. `jwt.ts` + `password.ts` — pure functions, trivial to cover
4. `buildContextMessages` — token-budget boundaries
5. One Supertest pass over each protected route: 401 without a token

Prerequisite: change `config/env.ts:80` from `process.exit(1)` to `throw` so importing config in a test doesn't kill the runner.

### 6. Rate-limit the WebSocket path 🟠

`chat:message` bypasses `express-rate-limit` entirely. Each message triggers a Gemini stream *plus* a Flash-Lite extraction call. One authenticated client in a loop generates unbounded API spend. Add a per-socket token bucket in the gateway (Redis-backed, same store as the HTTP limiter).

### 7. Extract `packages/api-client` and `packages/core` 🟠

Delete the mobile `failedQueue` interceptor, keep web's `refreshPromise` single-flight version, and share it. Then migrate mobile to TanStack Query and lift the data hooks into `packages/core`. This is the largest single reduction in ongoing maintenance cost available (§8), and every feature shipped before it makes it more expensive.

### 8. Add error boundaries and crash reporting 🟠

Zero error boundaries across both clients — one render error blanks the entire app with no recovery path. And there is no crash reporting: `logger.ts:3` says *"In production, replace with a proper logging service (Sentry, DataDog, etc.)"* — that replacement never happened, so **production failures are currently invisible to you**. Add a root boundary plus per-route boundaries, and wire Sentry into both clients and the server's `errorHandler`.

### 9. Wire the Socket.io Redis adapter 🟠

`socket/server.ts:20-23` documents the exact fix and does not apply it. Until then the app cannot run more than one instance without silently dropping `task:created` events for users connected to other processes. Ten lines, and it removes a hard ceiling on horizontal scaling.

### 10. Delete dead code and write a README 🟡

- Remove `findRefreshTokenByFamily`, `revokeRefreshToken`, `revokeTokenFamily` (or implement #1 and use them).
- Remove the unreachable `ForbiddenError` branches in `chat.service.ts:13` and `chat.gateway.ts:110`.
- Delete `voiceStore.ts` and `assets/index.ts` (zero importers).
- Uninstall `@react-native-voice/voice` — referenced only in a comment, but still pulling in a native module and its permissions.
- Write a root `README.md`: setup, the non-obvious local requirements (Homebrew Postgres, pgvector from source, `adb reverse`), and the run commands.

---

## 🔟 Final Senior Engineer Verdict

### Would I approve this for production?

**No — and the blocking list is short and specific.** Findings #1, #2, and #3 must be fixed, and #4 and #6 must be in place before real users touch it.

But I want to be precise about what kind of "no" this is. This is not a rewrite. The architecture is sound, the layering is real, the infrastructure thinking is genuinely good, and it typechecks and lints clean across four workspaces. Everything blocking is *localized and named*. A focused developer clears the critical tier in a week and the orange tier in a sprint. That is a completely different situation from a codebase that is structurally wrong.

### Would I approve this developer for promotion?

**Not to Senior yet — but they are closer than this report's score suggests, and the gap is one specific habit.**

Here is what I actually see. Someone who writes `passOnStoreError: true` and explains that a Redis outage should degrade rate limiting rather than take down the API is thinking like a senior engineer. So is someone who splits liveness from readiness with the correct reasoning, who knows that Matryoshka-truncated embeddings lose unit-norm guarantees, who documents *why* Socket.io shares the HTTP port in terms of load-balancer rules. You cannot fake that. It comes from having operated systems or from reading very carefully, and either way it is the expensive half of becoming senior.

**The missing half is cheaper to acquire and they haven't acquired it yet: seniors do not trust their own code until something external confirms it.**

Every serious finding in this report traces to that one gap:
- The auth comments describe a design that was *reasoned about* but never *executed* — and never run against a real token-theft scenario.
- The double-message bug survives because no one ever queried the `messages` table after a chat.
- Titles never persist because no one reloaded the sidebar and asked why everything said "New conversation."
- The client team coded against server behaviour that was documented but never verified.

None of these are hard problems. All of them are caught by *checking*. The developer wrote a `vitest.config.mts` and never wrote a test — that is the whole story in one artifact: they know what good practice looks like and stopped at the point where it becomes work that produces no visible feature.

**One more thing worth saying plainly, because it matters more than the score:** the tendency to write comments asserting properties the code does not have is the single most important habit to break here. Not because it is sloppy, but because it is *actively dangerous* — it disables the next reviewer, including your future self. A missing security control gets found. A security control that is confidently documented and absent does not. If you change one behaviour after reading this report, make it that: never describe what the code *should* do in a comment written in the present tense. Write it, verify it, then document it.

### What level does this feel like?

**Strong Mid-level (L4 / Mid-II) with clear senior trajectory.**

- **Junior** produces working features with unclear structure. This is well past that — the module boundaries alone rule it out.
- **Mid** produces working, well-structured features. This is comfortably that, at the top of the band.
- **Senior** produces working, well-structured, **verified** features and is trusted to own production. The structure is there. The verification is not.

**Concretely: fix the three critical bugs, ship CI, write twenty tests, and unify the client data layer.** Those four things move this from 6.1 to roughly 8.5, and they move the developer from "strong mid" to "senior" — because they are exactly the four things a senior would have done without being asked.

The foundation is good. Finish it.

---

*Audit performed by direct source inspection. `typecheck` and `lint` were executed across all four workspaces (both pass clean); test suites were executed (`apps/server` exits 1 — no test files; `apps/mobile` passes 1 test). All findings cite verified file:line references.*
