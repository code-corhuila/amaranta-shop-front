# amaranta-shop-front

> Front-end shell: packages the domain UIs

Part of the **Amaranta Shop** distributed system — team `amaranta-shop`, Grupo 2.
Governance and documentation live in [`amaranta-shop-docs`](https://github.com/code-corhuila/amaranta-shop-docs).

## Branching

Three permanent branches. **None of them accepts a direct commit** — you enter through a child
branch and leave through a Pull Request.

```
develop  <--PR--  feat/... fix/... chore/...
qa       <--PR--  qa/...
main     <--PR--  release/...  hotfix/...
```

Promotion happens **by re-application** (`git cherry-pick -x`), never by merging one permanent
branch into another: `merge develop -> qa` and `merge qa -> main` do not exist in this model.

`main` requires **1 approval from `ariel5253`**. On `develop` and `qa` the team sets its own review
rule.

Full policy: `00-governance/branching-policy.md` in `amaranta-shop-docs`.

## Role in the system

The shell of the web application (Annex H). It holds what must not be repeated in each portal, and nothing else: **the HTTP
client, the session, the navigation and the isolation of each portal**. Each domain's screens live in its own portal
(`amaranta-shop-catalog-portal`, `amaranta-shop-sales-portal`) and are loaded into the shell when their route is opened.

It talks to one server only, `amaranta-shop-api-gateway`, and it is the only place that knows where that is.

## Stack

**React 19, Vite, TypeScript in strict mode, Vitest and Module Federation** (`@module-federation/vite`), on Node 22. Annex H
allows React 19 or Angular 21; React was chosen because the monolith's web is already React, and the choice is recorded in
ADR-014 of `amaranta-shop-docs`. The type is Fredoka and Inter, self-hosted from npm (`@fontsource-variable`): no request
leaves for a third party.

## What the shell does for every portal

| Rule (Annex H) | Where |
|---|---|
| One HTTP client, lent to the portals as `shell/apiClient`; a portal never calls `fetch` against the API | `src/core/http/` |
| The gateway is the only destination; a portal asks for `/api/v1/...` and a path that names a host is refused | `apiClient.ts` |
| The token is attached when there is a session (none for a visitor, who can browse and buy); a `401` ends the session | `shellApiClient.ts` |
| A new `X-Correlation-Id` per request, and an `Idempotency-Key` when the screen gives one | `apiClient.ts` |
| 10 seconds per request; on expiry, `TIMEOUT` with status 0 | `apiClient.ts` |
| Every failure arrives as one `ApiError` (the common envelope, the `traceId`, the detail of each field) | `apiError.ts` |
| The text a person reads is decided in one function by status; what a service wrote for a developer is never shown | `userMessageFor` |
| The session: reads `sub`, `role` and `exp` of the token, never verifies it (every service does), survives a reload, ends when the token expires | `src/core/auth/session.ts` |
| A route that needs a person goes to the sign-in and comes back to where it was going | `RequireAuth.tsx` |
| **A portal may ask who is signed in, never hold the token**: `shell/auth` lends `useSessionInfo()` (role and subject) and `RequireRole`, which sends a visitor to the sign-in and tells another role it has no permission | `src/core/auth/exposed.ts` |
| The look is the design system of `amaranta-shop-docs` (ADR-007 "Fiery Ocean"): its tokens are global custom properties, and base styles cover the elements and roles the screens use, so a portal needs a class only for what is its own | `src/styles/` |
| **A portal that is down does not take the application down**: one boundary per portal, a retry, and the rest keeps working | `RemoteBoundary.tsx`, `RemotePortal.tsx` |
| Portals are downloaded when their route is opened (`shareStrategy: 'loaded-first'`), not at start | `vite.config.ts` |
| `remoteEntry.js` is never cached; hashed files are cached for a year; a missing file is a `404`, not the page | `deploy/nginx.conf` |

### The look, and what the design system never audited

`src/styles/tokens.css` holds the colours, type, radii and shadow of `12-ux-ui/design-system.md`. That document says its
contrast was never audited; it was, and two pairs failed WCAG AA for text (white on `ocean-500`, 3.3:1; the error red on
white, 3.8:1) and two borders failed 3:1 for a control (a field's 15% ink border, 1.3:1; the secondary button's `ember-300`,
2.2:1). Each semantic token takes the next tone of the same palette that passes. `src/styles/design.test.ts` checks that the
brand colours are the ones the design system names and that every pair the components draw is readable, and it fails if the
original values come back.

### The development sign-in

`DevSignIn` lets a developer paste a token from the security service. It exists **only while `import.meta.env.DEV` is true**
(Annex H, rule 5): a production build has no way in through it, and it is replaced by the identity portal before anything
reaches `main`.

## How to run

You need only Docker; nothing is installed on the machine.

```bash
bash scripts/test.sh
```

It runs, in containers and from the versioned `package-lock.json` (`npm ci`):

1. the strict type check and the test suite (the `test` stage of `deploy/Dockerfile`);
2. the production build with Module Federation, which must produce `remoteEntry.js`;
3. the final image, started, and `tests/serve.sh` against it: the cache rules, who may read its files from another origin,
   and the security headers.

The same script runs in CI on every pull request. To see the shell in a browser:

```bash
docker build -f deploy/Dockerfile -t shell:dev .
```

```bash
docker run --rm -p 4200:4200 shell:dev
```

Then open `http://localhost:4200`. With no portal running, `/catalog` and `/sales` show their notice and everything else works.

## Adding a portal

1. One entry in `src/remotes/registry.ts` (id, label, path, whether it needs a session).
2. Its remote in `vite.config.ts`, and its module declared in `src/remotes/remotes.d.ts`.
3. A test first in `src/app/App.test.tsx`; then `bash scripts/test.sh`.

## Status

The shell is complete as Annex H describes it, with **113 tests** and a verified build. It has been opened in a browser with a
portal switched off, and with the real catalog portal loaded into it behind the real gateway and the real `catalog-api`
(`scripts/e2e-real-stack.sh` in `amaranta-shop-catalog-portal`). Not done:

- **The sales portal** has no code yet. The catalog portal is done; the `Idempotency-Key` per intention and the checkout belong
  to the sales portal's screens.
- **No Tailwind.** The design system was written against Tailwind classes; here its tokens are plain CSS custom properties,
  which is what ADR-007 asked for ("a token-level change").
- **Refreshing the session.** The access token lasts 15 minutes; renewing it with the refresh token belongs to the identity
  portal, which does not exist yet.
- **Where the portals live** (`localhost:4201` and `4202`) is written for development in `vite.config.ts`.
