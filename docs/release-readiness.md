# Upgrade candidate release readiness

Audit of roadmap requirements against master `5fb7ae4`, 2026-10-22. This is not a release approval. The implementation summary is in [candidate release notes](release-notes.md). [PR #126](https://github.com/quyenanh198/ntvv/pull/126) is running the first Firefox/WebKit verification; update this record with its result before a staged release.

## Evidence rules

- Automated walkthroughs establish the behaviors they exercise, not player comprehension or physical-device usability.
- Asset inventory establishes catalog coverage and referenced paths, not a final style or rights approval.
- Simulations establish their stated scenarios, not actual level pacing or player retention.
- Synthetic migration/container tests do not establish a production-data restore.
- No open GitHub issues were returned during this audit. That does not prove no release-blocking defects exist.

## Requirement matrix

| Roadmap requirement | Current evidence | Remaining acceptance |
| --- | --- | --- |
| 1: Phone/tablet/desktop baseline captures and session recording | `scripts/browser-smoke.mjs` and CI artifacts capture responsive views | Record first ten minutes and a returning-player session with people |
| 1: Plant/harvest/sale/day-two/error measurements | Protected funnel, economy and metrics endpoints; integration coverage | Deployed mature cohort and five observed sessions |
| 1: Audience, feeling, sessions and three targets | `docs/product-brief.md`; `docs/player-session-script.md` | Validate inferred audience and identify three observed friction points |
| 2: Camera, light, outlines, palette, scale and reference scene | Scene standard in `docs/art-direction.md`; `asset/reference-scenes/farm-v3.png` | Final whole-screen coherence review on phone and desktop |
| 2: Crop/tree/animal/building/machine/product/UI/background inventory | `docs/art-inventory.md`: 36 paired crops, 13 trees/fruit items, 15 animals, 12 machines, 186 products, 367 static references | Style/provenance review of inherited assets; inventory alone does not prove consistency |
| 2: Export naming, transparency, variants and sources | Art guide, family prompt records, source directories, PNG exports and editable SVG generators | Audit every new sprite against its source/export record before release sign-off |
| 3: Replace gameplay art across catalog families | Painted crop/tree/animal/machine/product/decor/pet families; original interface vectors | Final consistency review; avoid treating intentional vector icons as missing sprites |
| 3: Soil states, feedback, depth and reduced motion | Distinct plot states, layered scene, exact harvest/help feedback, saved Reduce motion preference and device preference | Observed recognition of plot states without labels |
| 3: 320px clarity, targets and download size | Browser geometry/target checks, screenshot reviews, resized exports, transfer budgets | Manual phone sprite recognition and slow-network evaluation |
| 4: Guided plant-to-first-sale sequence | Fresh-account browser walkthrough plants, waters, harvests, opens inventory and sells | Five new players complete without help |
| 4: Progressive unlocks and phone next actions | Upcoming unlocks, accessible next-action controls, responsive farm-first layout | Observed comprehension; ensure no common starter dead end |
| 4: Fresh, returning and interrupted accounts | Browser reopens after planting/watering/sale; persisted farm assertions | Human returning-session observation |
| 5: Three unlock levels, short goal, usable seeds/inventory | Unlock preview, collections/reward prompts, search and counted filters | Four of five returning players start productive action within ten seconds |
| 5: Crop/order/animal/factory daily loop | Skill-adjusted timing, ready queues, feeding/pond views, order ingredient shortcuts and real API walkthroughs | Actual daily-loop pacing and comprehension |
| 5: Costs, rewards, failures before commitment | Purchase/upgrade balance previews, native in-game reviews, shortage states, exact rewards and stale-state guards | Final manual interaction review on release candidate |
| 6: Level time/gold/seeds/expansions/unlocks model | `docs/balance-report.md`; `docs/progression-report.md` with discrete levels 1–50 and all expansion prices | Broader whole-game progression, unlock utility and calendar/visit sensitivity; no claim of observed pacing |
| 6: Early/mid/late targets, loops, dead ends, inflation and skip pressure | Product hypotheses; crop/animal/recipe/tax/order models | Explicit validated pacing targets and player evidence before final tuning |
| 6: Constants, simulations, sessions and change reasons | Starter tax grace and fast-order changes documented; reproducible reports checked by CI | Observed sessions and tuning review against deployed totals |
| 7: Visiting/help/trade/gift flows from both sides | Two-browser watering/gifting/request/payment/trade/inspection; readable visitor state and limits | Broader human social-play observation |
| 7: Contention, failed actions and synchronization | Journal replay/restart tests, three-farmer trade contention, two-client state checks | Release-candidate manual two-player walkthrough |
| 8: Collections/personalization/achievements/events | Persistent collections, star rewards, owned decoration/pet gallery, title controls, festival and reward hub | Confirm players can name a next-session and next-week goal |
| 8: One collection and recurring event prototype | `docs/collection-design.md`; `docs/festival-design.md`; actual claims in browser/API coverage | Observe whether rewards support ordinary play |
| 9: Every value-changing endpoint journaled atomically | 59 replay-safe POST routes, server/client route contracts and broad mutation/retry/contention/restart tests | Maintain explicit route-to-test evidence; route count alone is insufficient coverage proof |
| 9: Bodies/errors/auth/CSRF/migrations/backups | Contract validation tests, origin boundaries, transactional migrations, `npm run db:rehearse`, operations guide | Production copy migration and staged restore with existing farmer state |
| 9: Request IDs, errors/latency/cold starts/replays | Response IDs, protected aggregate metrics and `npm run ops:monitor` capture/resume tool | Deployed collection/alerts, external cold-start observations and operational rehearsal |
| 10: Startup/images/render/polling measurements | Transfer baseline/budgets, request races, persistent DOM checks, lazy catalog images and screenshots | Representative slow-network, memory, rendering and polling measurements |
| 10: Keyboard/focus/contrast/names/targets/motion | Automated axe/geometry/focus checks, shared action dialogs, live announcement node, motion/critters walkthroughs | Manual keyboard and screen-reader audit; real speech output is unverified |
| 11: Unit/integration/two-player/migration/manual release checks | Existing Chromium/server/report/audit/container CI green at PR #126; Firefox/WebKit pending | All three engines green; manual release-candidate browser/device checks |
| 11: Content/art/economy/backup/rollback review and small cohort | Art sources/prompts, scenario reports, backup/rehearsal command and operator instructions | Final content/provenance review; production-compatible backup/restore and code rollback on staging; cohort deployment |
| 11: Merge, release notes and post-release observation | Many verified increments merged to master; PR links and acceptance records | Publish consolidated release notes, staged deployment and mature first-session/day-two results |
| 12: Choose fixes from actual behavior and retest | Study script, provisional product metrics and aggregate instrumentation | First staged evidence and resulting priority/retest cycle |
| 12: Keep inventory/models/tests/roadmap current | Generated reports enforced by CI; acceptance records for merged increments | Reconcile stale roadmap summary statements with current implementation and retain open human/deployment gates |

## Required handoff evidence

1. Record Firefox and WebKit job outcomes for PR #126 and review their farm/dialog screenshots. Fix any actual incompatibilities before merging.
2. Publish this audit and consolidated release notes against a merged revision; include exact CI links and the scope of each result.
3. Complete a source/export/provenance inventory review and final phone/desktop visual review. Do not infer rights from file presence or generated coverage.
4. Run and record manual keyboard, screen-reader and physical-device checks on that candidate.
5. Run five first-player observations plus returning-player observations using the study script. Retain anonymous notes and actual times.
6. The user deferred providing the locally hosted database. Once supplied, rehearse backup, migration, state load, restore and compatible code rollback on staging.
7. Deploy to a small cohort with persistent metrics/alerts; collect mature funnel/economy results. Choose and retest the next fixes from that evidence.

The goal remains open. Neither implementation coverage nor green synthetic tests substitutes for these remaining release gates.
