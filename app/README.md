# @flashcards/app

The learning application built on the library. Specification:
[`docs/app/requirements.md`](../docs/app/requirements.md) (`APP-*` requirement IDs).

**Status: scaffold only.** The shell and router arrive in
[T-30](../docs/tasks/T-30-app-shell.md), the deck page in [T-31](../docs/tasks/T-31-deck-page.md).

## Running it

```sh
npm run build     # from the repository root — builds the library, then the app
npm run serve     # → http://localhost:8000/app/
```

`file://` will not work (`APP-17.6`): ES modules and import maps both require a real HTTP origin. The
`serve` script exists for exactly this reason — there is no dev server in the toolchain, because there is no
bundler ([D4](../docs/decisions/D4-typescript-no-bundler.md)).

## How the library is resolved

No bundler rewrites imports, so `index.html` carries an import map:

```json
{ "imports": { "@flashcards/library": "../library/dist/index.js" } }
```

The address is relative to the document, so the same map works at a site root and under a project sub-path on
GitHub Pages ([T-33](../docs/tasks/T-33-deploy.md)). TypeScript resolves the same specifier through the npm
workspace link at compile time, and emits it unchanged.
