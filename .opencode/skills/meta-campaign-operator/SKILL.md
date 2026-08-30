---
name: meta-campaign-operator
description: Use for repeatable Meta campaign builds, metrics reporting, and rejected-ad monitoring from image folders, five-link templates, and approved account/Page rules.
---

# Meta Campaign Operator

Operate Meta Ads through the approved server-side MCP adapter. Never expose
tokens, temporary upload URLs, or raw credentials to the browser.

## Safety Rules

- Use only the account and Page explicitly selected for the run.
- Check account status, Page access, Page ad-limit capacity, and spend capacity
  before publishing.
- Treat `targeting` as a full replacement when updating Meta resources.
- Enforce the configured Page ad limit before creating ads.
- Hash every image and skip duplicate content within a build.
- Persist campaign, ad set, creative, and ad IDs after each successful item.
- Resume from persisted IDs; never replay successful items after a timeout.
- Retry only failed items, with bounded retries and exponential backoff.
- If Meta reports authentication, policy, Page-permission, disabled-account, or
  unsettled-account errors, stop writes for that account and surface the exact
  human action required.
- Meta ad deletion is not assumed to be available. Pause rejected ads and their
  parent campaign when the configured policy says to stop delivery.

## Build Defaults

- Traffic objective with `LANDING_PAGE_VIEWS` optimization.
- Saudi Arabia, men, ages 18-65 unless the user changes them.
- Automatic placements unless placement restrictions are explicitly requested.
- Five destination links, one link group per campaign.
- No primary text, description, or URL tags unless supplied.
- Use a valid Meta CTA such as `LEARN_MORE`; do not invent `SEE_MORE`.

## Build Procedure

1. Validate the input folder and deterministic image selection.
2. Calculate campaigns, ad sets, ads, Page usage, and budget before writes.
3. Upload/register assets in bounded batches and store returned hashes.
4. Create campaigns, then ad sets, then creatives, then ads.
5. Reconcile live resources after any timeout before retrying.
6. Record an audit event for every write and every blocked item.
7. Report configured status separately from Meta effective delivery status.

## Rejected-Ad Monitor

Run on a schedule through a server-side worker. Fetch current ad statuses,
identify explicit `DISAPPROVED` or `REJECTED` states, pause those ads and their
parent campaigns, and write an audit event. Do not treat `PAUSED`, `IN_PROCESS`,
or `PENDING_REVIEW` as rejected.

## Metrics

Fetch account, campaign, ad set, and ad-level results with a declared date range
and timezone. Store raw fetch metadata plus normalized spend, impressions,
clicks, LPVs, CPM, CTR, CPC, and cost per LPV. Show `lastFetchedAt` and data
age in the dashboard.
