# Farm upgrade candidate notes

Implementation baseline: master `5fb7ae4` (merged PRs through #125), 2026-10-22. These notes describe committed changes available for release-candidate review. They do not announce a production deployment. The [readiness matrix](release-readiness.md) records the remaining roadmap gates.

## Graphics and layout

- The painted farm scene has matched buildings, pond, farmer and gameplay artwork. Empty, growing, dry and ready plots have distinct treatments.
- All 36 crops have growing/ripe art; all 13 fruit trees and fruit items, 15 animals and 12 machines have individual art. All 186 catalog products have PNG/SVG icons. All 22 decorations and seven pets have painted previews shared by the shop and owned gallery.
- Dock, feature-menu and header controls use a shared original SVG family with visible labels. Phone layouts put the next action and field before family search; desktop has a separate family sidebar.
- Shop categories, inventory search and counted filters help navigate the catalog. Scene herds, unlocks and guards follow the farm owner. Decoration and pet galleries are named, bounded and keyboard-scrollable.
- Resized game exports preserve high-resolution sources. CI enforces initial image/transfer budgets; later sheets and real slow-network behavior still need measurement.

## Starting and returning

- First-session guidance covers seed choice, planting, watering, harvest, inventory and first sale. Interrupted-session checks preserve crop and wallet state.
- Upcoming unlocks, collection progress and a ready-reward hub provide short-term goals. Next actions can lead to ready orders, factory batches, hungry animals or the next growing crop.
- Crop, tree, animal, pond and factory previews include learned speed bonuses. Plot graphics follow persisted planting/readiness times.
- Orders show held/missing quantities and rewards, with crop/recipe shortcuts. One regular slot guarantees a fast crop offer under the documented catalog model.
- Barn, pond, factory and shop screens explain capacity, feed, queues, ingredients and affordable quantities. Upgrade/gem decisions preview costs, shortages and resulting balances.
- Tree removal has a separate review. Speedups and removal use reviewed mutation versions so stale decisions can reject without spending or deleting replacement trees.
- Individual and bulk harvest feedback uses committed item/XP/gold gains and distinguishes plots from units. Friend watering reports the actual capped time reduction and payment.

## Social play and goals

- Gold gifts and requests have labeled amounts, balance guidance and cancellation. Recipient cards explain payment and shortfalls.
- Trade-board search, availability filters, proceeds and escrow previews support buyers and sellers. Contention tests check transfers, partial fills, cancellation and retry conservation.
- Inspection mode shows remaining checks, used crops, unavailable trees and exhausted attempts. The two-player walkthrough covers planting, visitor disguise, a miss, detection, reward and owner synchronization.
- Persistent harvest collections, star milestones, daily quests and recurring festivals have progress, activity shortcuts and replay-safe claims.
- Personalization includes titles, frames, decorations and pets. These purchases are cosmetic and their gold cost is not refunded.

## Input and accessibility

- Core sheets trap focus, close with Escape and restore opener focus. Shared in-game reviews default to Cancel and wrap keyboard traversal within their controls.
- Quantity forms have visible labels, invalid/shortfall guidance and usable touch targets. Automated accessibility checks cover the farm and key sheets.
- A stable polite live region announces feedback; floating duplicates are decorative. Actual speech behavior still needs a manual screen-reader check.
- A saved Reduce motion setting works alongside the device preference. Catchable animals stay visible and stationary when movement is suppressed.
- Existing CI covers phone, tablet, landscape and desktop views. Firefox/WebKit verification is tracked in PR #126; it does not establish physical Safari/iPhone behavior.

## Backend and operations

- Fifty-nine value-changing POST routes use journaled results. Tests cover duplicate/concurrent retries, contention and database reopen across gameplay families.
- Persisted mutation versions and response ordering prevent older responses from rolling back newer actions. Independent plots can be pending without locking all navigation.
- Catalog IDs, quantities and bodies are validated. Mutations require JSON and enforce browser origin boundaries. Chat remains the authentication authority.
- Migrations run transactionally. The backup command checks a temporary restore, row counts and an existing farmer state; a real-data rehearsal remains required.
- Request IDs and protected aggregate metrics support diagnosis. `npm run ops:monitor` captures health/metrics to JSONL, resumes baselines and distinguishes restarts from interval rates.
- Funnel and daily economy aggregates begin collecting after deployment and cannot reconstruct earlier behavior.
- Clean-install CI checks server tests, browser flows, generated reports, dependency audit and production-image persistence.

## Economy decisions and limits

Starter land-tax grace prevents the original early tax deadlock; tax begins at level 20. A fast regular-order slot provides a fresh-field option under the documented assumptions. The [balance report](balance-report.md) explains these changes and models crops, expansions/tax, animals, recipes and ingredient supply.

The [progression report](progression-report.md) adds 16 discrete crop-only paths through levels 1–50, carrying cash, sow/harvest XP, crop deadlines and tax. These greedy scenarios exclude other systems. Their completion times are not observed player pacing and do not justify further tuning by themselves.

## Before a staged release

1. Finish browser-engine verification and review phone/desktop captures. Record release-blocking defects and retest fixes.
2. Complete source/export/provenance and final content/style review.
3. Record manual keyboard, screen-reader and physical-device checks, plus slow-network/rendering/polling measurements.
4. Run five observed first sessions and returning observations using the [study script](player-session-script.md). Record actual confusion and times.
5. When the user supplies the deferred local database, rehearse backup, migration, farmer state load, restore and compatible code rollback on staging using the [operations guide](operations.md).
6. Enable persistent metrics/alerts for a small cohort. Evaluate [product targets](product-brief.md) only after the ten-minute and 48-hour denominators mature. Choose and retest subsequent changes from that evidence.

Merging this candidate does not close these gates or establish production readiness.
