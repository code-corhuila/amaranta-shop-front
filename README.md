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

Front-end shell: it packages the domain interfaces as one application and holds what must not be repeated in each portal: the HTTP client, the session, the navigation and the common components (norm rule 9).

## Depends on

`amaranta-shop-api-gateway` (the only server it talks to) and the portals `amaranta-shop-catalog-portal` and `amaranta-shop-sales-portal`, loaded as remotes.

## How to run

Nothing to run yet. Once the shell lands: `npm ci` then `npm start`; `npm test` runs the tests.

## Stack

Angular shell from the teacher's `front-shell-angular` template. The interface framework of each portal is pending its own ADR.

## Status

**Skeleton.** Only the base of a code repository is here (norm 5.1); nothing in it runs yet, and this README says so
on purpose. Next pull request: `feat/shell`: the shell with its HTTP client and session.
