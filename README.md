# google-api-wrappers

[![CI](https://github.com/damiansire/google-api-wrappers/actions/workflows/ci.yml/badge.svg)](https://github.com/damiansire/google-api-wrappers/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Small, **typed**, low-dependency Node.js wrappers for Google APIs — each one hides the boilerplate (auth plumbing, pagination cursors, quota errors) behind a tiny surface you can actually remember. Organized as an npm-workspaces monorepo: every wrapper ships to npm under its own name, but they evolve, test and release together here.

## Packages

| Package | Version | What it does | Why reach for it |
|---|---|---|---|
| [`youtube-fast-api`](packages/youtube-fast-api) | [![npm](https://img.shields.io/npm/v/youtube-fast-api)](https://www.npmjs.com/package/youtube-fast-api) | YouTube Data API v3 client: comments, channel videos/playlists, video metadata, search. | **Zero runtime dependencies.** Stateless async-iterator pagination, typed error hierarchy (`QuotaExceededError` / `RateLimitError`), automatic backoff honoring `Retry-After`. |
| [`google-sheets-wizard`](packages/google-sheets-wizard) | [![npm](https://img.shields.io/npm/v/google-sheets-wizard)](https://www.npmjs.com/package/google-sheets-wizard) | Read Google Sheets ranges as arrays — or map them straight to objects. | One call (`getRange`) instead of the full `googleapis` Sheets ceremony, with clearer errors for the usual traps (permissions, missing sheet). |

## Why these wrappers

- **Low / zero dependency.** `youtube-fast-api` pulls in *nothing* at runtime; `google-sheets-wizard` only expects `googleapis` as a peer. No transitive surprise in your `node_modules`.
- **Typed, and verified typed.** Each package ships `.d.ts` and CI checks them against `node10`, `node16` (CJS + ESM) and bundlers with [`arethetypeswrong`](https://github.com/arethetypeswrong/arethetypeswrong.github.io) + [`publint`](https://publint.dev/) on the real tarball — so the types resolve for *your* setup, not just the author's.
- **Tested behavior, not just happy paths.** The tricky real-world cases — quota exhaustion, rate-limit retry, pagination of two resources at once — are covered by `node --test` / Jest suites.
- **Quality-gated on every PR.** CI runs lint, tests, type-tests, package checks ([`publint`](https://publint.dev/) + [`arethetypeswrong`](https://github.com/arethetypeswrong/arethetypeswrong.github.io) on the real tarball), circular-import checks ([`dpdm`](https://github.com/acrazing/dpdm)) and a bundle-size budget ([`size-limit`](https://github.com/ai/size-limit)). Dead-code ([`knip`](https://knip.dev/)) and monorepo consistency ([`sherif`](https://github.com/QuiiBz/sherif)) are part of the dev toolchain but run locally (their native binaries are currently blocked in the CI/dev environment).

## Install

Install only the package you need:

```bash
npm i youtube-fast-api
# or
npm i google-sheets-wizard googleapis   # googleapis is a peer dependency
```

## Quickstart

```js
// youtube-fast-api — every comment on a video, no manual pagination
const YoutubeClient = require("youtube-fast-api");
const yt = new YoutubeClient(process.env.YT_API_KEY);

for await (const comment of yt.comments("dQw4w9WgXcQ", { pageSize: 100 })) {
  console.log(comment.textDisplay);
}
```

Full API, auth setup and error handling live in each package's README:
**[youtube-fast-api →](packages/youtube-fast-api#readme)** · **[google-sheets-wizard →](packages/google-sheets-wizard#readme)**

## Development

```bash
npm install            # installs every workspace
npm test               # run all package test suites
npm run test:types     # type-tests (tsd) across workspaces
npm run lint           # eslint across workspaces
```

Releases are automated with [Changesets](https://github.com/changesets/changesets): a changeset per user-facing change, and `release.yml` publishes the affected packages to npm and tags them. Add one with `npm run changeset`.

## License

[MIT](LICENSE) © [damiansire](https://github.com/damiansire)
