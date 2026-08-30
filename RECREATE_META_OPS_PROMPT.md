# Resume Prompt: Meta Ops Dashboard

Continue the Meta Ads operations dashboard project in:

`C:\Users\Administrator\Documents\Default Project`

## Current State

- Next.js app is in `web/`.
- Meta Ops dashboard route: `/ads`.
- Campaign builder route: `/ads/builder`.
- Demo overview API: `/api/ads/overview`.
- The Meta Ops pages and demo overview endpoint are intentionally public for preview; the rest of the app remains protected by Firebase auth.
- Demo data is clearly labeled as demo data.
- `web/src/lib/meta-dashboard.ts` contains the dashboard types and seeded demo metrics.
- `web/src/app/ads/page.tsx` contains the dashboard UI.
- `web/src/app/ads/builder/page.tsx` contains the builder UI.
- `render.yaml` was added for a free Render web service.
- A temporary Cloudflare tunnel was used for preview, but it is not permanent.

## Verification Already Completed

- `npm install` completed.
- `npm run typecheck` passes.
- `npm run build` passes when Firebase public environment variables are supplied.
- The build requires these variables, even for a demo build:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`

## User’s Desired Final Product

Build a real hosted Meta Ads operations system using Pipeboard MCP and AdKit MCP:

- Live account, campaign, ad set, ad, spend, and performance data.
- Rejected-ad list with rejection reasons.
- Automatically pause rejected ads/campaigns.
- Run monitoring through a hosted scheduler, preferably every 5–15 minutes, not every second because of Meta API rate limits.
- Repeatable live campaign builder using selected image folders, five destination links, country, budget, CTA, objective, Page, and image allocation.
- Queue large builds so uploads, dependencies, retries, idempotency, Page limits, and audit logs are handled safely.
- Never expose Pipeboard, AdKit, Meta, or Firebase server credentials in browser code.
- Preserve successful IDs and prevent duplicate batches.
- Use pause instead of deletion because permanent ad deletion is not currently available through the MCP tools.
- Keep a human approval gate before large live writes.

## Required Architecture

```text
Public Next.js dashboard on Render
        |
        v
Server-side API / hosted MCP bridge
        |
        +--> Pipeboard MCP
        +--> AdKit MCP
        |
        v
Meta Ads

Hosted scheduler/worker --> rejected-ad monitor and build queue
Firestore                --> IDs, jobs, metrics, rejection events, audit logs
```

## Important Blocker

The current OpenWork session can call Pipeboard/AdKit MCP tools, but the public Next.js app cannot automatically call those tools. A real hosted bridge needs either:

1. A machine-accessible Pipeboard/AdKit MCP endpoint plus credentials, or
2. A hosted bridge service already connected to those MCP providers.

Do not claim the dashboard is live until the bridge is actually connected and tested.

## Deployment Plan

1. Connect this project to GitHub/GitLab or provide a Render deploy method.
2. Deploy the Next.js web service using `render.yaml`.
3. Configure Firebase public and server-only environment variables in Render.
4. Deploy the hosted MCP bridge and worker.
5. Set `META_MCP_BRIDGE_URL` and `META_MCP_BRIDGE_TOKEN` server-side only.
6. Replace demo data in `/api/ads/overview` with normalized live bridge data.
7. Add authenticated rejected-ad and campaign-build API routes.
8. Add Firestore persistence and scheduled worker execution.
9. Test read-only metrics first, then test one approved Page/account, then enable guarded writes.

## Safety Rules

- Use only explicitly approved Pages/accounts.
- Maximum 250 ads per Page.
- Check Page ad volume before publishing.
- Use deterministic idempotency keys.
- Never retry successful writes.
- Retry only failed/transient operations.
- Keep live and demo states visibly distinct.
- Do not use a temporary Cloudflare URL as production hosting.

## Resume Instructions

Start by inspecting the current files and checking whether Render credentials, repository remotes, and a real Pipeboard/AdKit bridge endpoint are available. If credentials or the bridge are missing, finish the deployment scaffold but stop before claiming live Meta functionality.
