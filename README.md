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
allows React 19 or Angular 21; React was chosen because the monolith's web is already React. That choice still has to be
recorded in an ADR in `amaranta-shop-docs`.

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
| **A portal that is down does not take the application down**: one boundary per portal, a retry, and the rest keeps working | `RemoteBoundary.tsx`, `RemotePortal.tsx` |
| Portals are downloaded when their route is opened (`shareStrategy: 'loaded-first'`), not at start | `vite.config.ts` |
| `remoteEntry.js` is never cached; hashed files are cached for a year; a missing file is a `404`, not the page | `deploy/nginx.conf` |

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

The shell is complete as Annex H describes it, with **70 tests** and a verified build, and it was opened in a browser with a
portal switched off. Not done:

- **The portals.** Neither `catalog-portal` nor `sales-portal` has code yet, so no portal has been loaded for real; the
  loading is tested with doubles and the failure with a real browser. The four states of a screen, the `Idempotency-Key`
  per intention, and money from text belong to the portals' screens.
- **Appearance.** The shell has no styles: it is structure and behaviour. The monolith's web uses Tailwind.
- **The ADR** that records the choice of React.
- **Refreshing the session.** The access token lasts 15 minutes; renewing it with the refresh token belongs to the identity
  portal, which does not exist yet.
- **Where the portals live** (`localhost:4201` and `4202`) is written for development in `vite.config.ts`.
