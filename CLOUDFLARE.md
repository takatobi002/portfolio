# Cloudflare hosting

This project keeps MkDocs as its existing site builder. Workers serves the generated `site/` directory, and handles only `/api/*` and `/admin*` before assets.

## Setup

1. `python3 -m venv .venv` then `.venv/bin/pip install -r requirements.txt`.
2. `npm ci`, then `npx wrangler login`.
3. `npx wrangler d1 create chitabea-responses`; set its returned database ID in `wrangler.jsonc`.
4. `npx wrangler d1 migrations apply chitabea-responses --remote`.
5. Set a strong teacher password through `npx wrangler secret put ADMIN_PASSWORD`. Never commit or paste this password into source.
6. `PATH="$PWD/.venv/bin:$PATH" npm run deploy`.

Until a custom domain is verified, use the returned workers.dev address. Move DNS to Cloudflare before adding `www.chitabea.com` and `chitabea.com` as Worker Custom Domains. Preserve existing MX/TXT records. Keep GitHub Pages available for rollback until the domain serves the new site correctly.

## Teaching

- Participant URL: `/life-evaluation/?cohort=2026-11-16` (ASCII letters, digits, hyphens, underscores; max 64 characters).
- Missing cohort defaults to `life-evaluation-2026`.
- Teacher URL: `/admin/`; username `teacher`, password from the Worker secret.
- Submission is optional, with an explicit consent checkbox. No name, email, student ID or IP address is stored in D1. Rate limiting transiently uses the connecting IP to reduce automated submissions; logs do not include answer bodies or authorization headers.
- The admin page provides response count, score mean/median/distribution, answer percentages, support/freedom group means, and CSV export by cohort.
- Empty score is NULL; score 0 is a valid answer. Missing/declined answers are excluded from valid-response denominators. UUID submission IDs make retries idempotent. This reduces duplicate retries, not repeated submissions by the same person across reloads/devices.
- Reset clears the browser display; it does not delete submitted data. No public read API exists. Authentication is checked for both admin assets and data; private responses use `Cache-Control: no-store`.

## Checks

`npm test` runs validation/authentication checks. `mkdocs build --strict` checks the entire existing site. Apply local D1 migrations, set a throwaway `.dev.vars` password and run `npm run dev`, then `node test/local-integration.mjs` to test local persistence and aggregation. The integration script is hardcoded to localhost and creates only local synthetic records.

`npx wrangler deploy --dry-run` validates Worker packaging. Remote data and domain behavior require separate verification.

## Current deployment

- Cloudflare account: takatobi002@gmail.com
- Worker: `chitabea`
- URL: https://chitabea.takatobi002.workers.dev
- Production D1: `chitabea-responses` (`38efdc11-78d2-4812-9b08-2bd64b95c886`).
- Admin password is configured as a Worker secret.
- Custom-domain cutover is pending addition of `chitabea.com` to Cloudflare DNS and nameserver configuration at the registrar.
- The legacy GitHub Pages branch remains in place as a fallback. The build workflow no longer republishes it; future releases use Cloudflare.

## MuuMuu Mail / external DNS

MuuMuu Mail requires retaining MuuMuu DNS. Do not switch nameservers. Use Pages project `chitabea-web` for the public website; `www.chitabea.com` can be connected using a CNAME at MuuMuu DNS after registering that custom hostname in Pages. Keep all mail records and the apex domain unchanged. The Pages gateway forwards API/admin requests through a service binding to the existing `chitabea` Worker; D1 and the teacher secret stay there.

Build with `npm run build:pages`, deploy with `npm run deploy:pages`. Server gateway code lives outside public assets in `pages/functions/`; `_routes.json` invokes it only for API/admin paths. Pages publishing requires `pages:write` permission. Domain-connection status above is superseded by this external-DNS configuration.

Pages deployment: https://chitabea-web.pages.dev. The custom domain `www.chitabea.com` is registered with Pages and awaits a CNAME at MuuMuu DNS pointing `www` to `chitabea-web.pages.dev`. Nameservers must stay `dns01.muumuu-domain.com` and `dns02.muumuu-domain.com`.

## Completed custom domain

`www.chitabea.com` is active on Cloudflare Pages with HTTPS. MuuMuu DNS CNAME `www` points to `chitabea-web.pages.dev`; MuuMuu nameservers and mail records remain unchanged. Public worksheet and authenticated admin/statistics endpoints have been verified using the custom hostname. Earlier pending-cutover notes are historical. Use `npm run deploy` for a full release of both backend and Pages.
