# NTVV full upgrade: step-by-step delivery plan

This is the project plan for the farm game, separate from the older stability audit. Work proceeds on `upgrade/farm-v3`; release to `master` only after the acceptance gates below pass. The existing gameplay spec describes current rules, not a locked design for this upgrade.

## 1. Establish the player baseline

- Capture the current farm at 320, 390, 768, and desktop widths; record the first 10 minutes and a returning-player session.
- Gather player feedback or analytics for first crop planted, first harvest, first sale, day-2 return, and errors. If none exist, run 5 observed play sessions before final balance decisions.
- Deliver a one-page product brief: audience, core feeling, session lengths, and three measurable goals.
- **Gate:** the team can name the top three points where players stop or become confused. **Status:** pending external player evidence; code inspection and local browser walkthrough completed.

## 2. Define the visual language and asset inventory

- Set a shared camera angle, outline weight, lighting direction, palette, shadow, and sprite scale. Draw a reference farm scene. The working standard and inventory are in [art-direction.md](art-direction.md).
- Inventory every crop growth state, tree, animal, building, machine, product, UI icon, and background; label missing assets and inconsistent styles.
- Set export rules: transparent PNG/WebP, predictable names, size variants, and a source file for every new sprite.
- **Gate:** a single screen using the new art feels coherent at phone and desktop sizes. **Status:** first coherent building set, farmer, shared hand-painted seedling, all thirty-six matched crop pairs, individual art for all fifteen animal and thirteen fruit-tree species, and all twelve factory machine sprites added to a working art guide and generated catalog/static-asset inventory; reference scene and remaining families pending.

## 3. Upgrade the farm scene and graphics

- Replace remaining mixed emoji/SVG gameplay art in batches: starter crops and growth states, trees, animals, machines, then decorations.
- Add readable soil states, planting/watering/harvest feedback, object depth, and restrained ambient motion. Honor reduced-motion settings.
- Test sprite clarity and tap targets at 320px; keep downloads small through resizing and compression.
- **Gate:** a player can distinguish empty, growing, dry, and ready plots without reading labels. **Status:** four plot states now have distinct soil and border treatments, and a 320px browser check confirms they render together with accessible action names; observed-player validation and other asset families remain pending.

## 4. Rebuild the first session

- Guide one plot through seed choice, planting, watering, harvest, inventory, and first sale. Make every prompt lead to the right action.
- Reveal new systems only when unlocked. Put accessible next actions above the plots on phones.
- Test with a fresh account, a returning low-level account, and an interrupted session.
- **Gate:** five new players complete the first sale without help; no starter can be blocked by tax or unaffordable seed. **Status:** guided path implemented; CI drives a fresh player through seed selection, planting, watering, ready-state harvest, inventory, and first sale at 320px, checking that the sale leaves more gold than the starter balance. The browser closes and reopens after watering to verify the crop persists, then returns after the sale to verify gold and the empty plot persist. Growing and ready screenshots were reviewed. The five-player observed gate remains pending.

## 5. Make everyday play easy to read

- Show the next three unlock levels and the current short-term goal. Simplify seed and inventory choices so usable items appear first.
- Review crop timings, waiting periods, orders, animals, and processing queues as one daily play loop.
- Make ready states, costs, rewards, and failure reasons clear before an action is committed.
- **Gate:** a returning player can find a productive action within 10 seconds. **Status:** upcoming unlocks and early seed choice shipped on branch; the farm-first responsive layout now puts next action and plots before family search on phones and gives the family a separate desktop sidebar. The order sheet now puts deliverable orders first and names each requested product, held quantity, missing count, and reward. Layout direction and measured checks are in [layout-direction.md](layout-direction.md); timing and player validation pending.

## 6. Rebalance progression and economy

- Model each level's expected play time, gold earned, seed cost, expansion price, and unlock value in a spreadsheet or script.
- Set separate early, mid, and late game targets. Check profitable loops, dead ends, runaway currency, and pay-to-skip pressure.
- Tune server constants, then run simulations and observed play sessions. Document every changed number and its reason.
- **Gate:** no common action leaves a player unable to continue, and level pacing matches the product brief. **Status:** starter tax deadlock fixed; the [balance report](balance-report.md) models all regular crops, visit cadence, expansion prices and land tax across all 97 expansions, opportunity margins across all 137 machine recipes, feed-adjusted sale income for all 15 animals, and sampled order premiums. No modeled expansion loses gold from its four new plots at one or three visits per day, but crop-only payback reaches 138 days for the final expansion. All sellable recipes have positive opportunity margin; machine throughput remains an upper bound without ingredient supply and unlock timing. Animal purchase payback is under two days at three visits per day before barn costs, suggesting a tuning review. Sampled orders pay roughly 17–18% above direct sale value; actual completion rate remains unknown. The report also exposes an outdated daily-income target in the gameplay spec. Player measurement and tuning remain pending.

## 7. Improve social play

- Make visiting, helping, trading, gifting, and the trade board understandable from both players' perspectives.
- Define limits and feedback for contested actions, failed trades, and inventory changes; verify two-client synchronization.
- **Gate:** gifts and trades cannot transfer value twice when requests are retried; two-player walkthrough passes. **Status:** journal protection added for gifts, gold requests and payments, trade board actions, friend watering, help planting/harvesting, and inspection. Two-farmer integration tests cover duplicate and concurrent retries. CI now opens two browser accounts, visits a friend's farm, waters a plot, confirms the owner sees it ready, gifts gold, and checks both balances. Trade-board and broader two-player browser walkthroughs remain pending.

## 8. Add durable long-term goals

- Design collections, farm personalization, achievements, and event rewards around existing systems before adding more currencies.
- Prototype one small collection and one recurring event; check that rewards serve ordinary play.
- **Gate:** players have a visible goal for the next session and the next week. **Status:** unlock preview and a persistent two-set [harvest collection](collection-design.md) added, with a farm-toolbar progress prompt, one-time rewards, and replay-safe claims. Existing festival supplies a recurring event; observed-player validation and event redesign remain pending.

## 9. Harden the backend and data model

- Finish replay protection for every value-changing endpoint; keep each mutation and its result in one SQLite transaction.
- Validate request bodies, enforce consistent error responses, review auth/CSRF boundaries, and add safe migrations and backup instructions.
- Add request IDs and operational metrics for error rate, latency, cold starts, and replayed mutations.
- **Gate:** mutation integration tests cover duplicate requests, concurrent requests, and restarts; migration works on a copy of production data. **Status:** journal foundation and fifty-nine routes covered, including upgrades, fishing, fish farming, gem and energy purchases, luxury purchases/equipment, collection claims, watering, inspection, help planting/harvesting, gold requests, speedups, skills, dog hiring, fruit-tree changes, timed critter rewards, away-report dismissal, and crop/barn/machine theft. Purchase, queue, and fish-harvest endpoints reject malformed quantities and IDs; integration tests verify unchanged player value and valid bulk actions. All API mutations require JSON and reject cross-site browser requests before farmer state changes; direct and HTTPS-proxy origin tests pass. Schema upgrades run in one transaction; tests cover preservation of a running legacy machine job, idempotent reopen, and rollback on forced failure. A [backup and rehearsal command](operations.md) migrates a temporary copy and verifies integrity and core row counts. API responses carry request IDs, and a secret-protected metrics endpoint exposes startup readiness, uptime, request/error counts, latency buckets, and mutation replays. Persistent monitoring, external request cold-start timing, production-data migration rehearsal, restore rehearsal, and remaining route-level tests are pending.

## 10. Improve speed and accessibility

- Measure mobile startup, image payload, rendering work, and state polling. Optimize the measured bottlenecks.
- Audit keyboard control, focus after sheets close, text contrast, screen-reader names, touch size, and reduced motion.
- **Gate:** core game works at 320px, on keyboard, and with a screen reader; performance budgets set from baseline measurements. **Status:** 320px layout and targeted browser checks pass; CI now runs a deterministic Chromium smoke check across 320px, 390px, 768px, 1180px, and 1280px, captures reviewable screenshots, and verifies order-sheet layout, keyboard focus trapping/return, horizontal overflow, browser script errors, and 44px order-action targets. The [mobile transfer baseline](performance-baseline.md) shows first-load image transfer falling from 1.69 MB to 0.76 MB after resizing four scene exports; CI now enforces image and total-local transfer budgets. Farm sheets, leaderboard, and return report have dialog semantics, keyboard focus traps, Escape handling, and focus return. Factory recipe controls have 44px minimum touch targets, visible keyboard focus, action-specific screen-reader names, and distinct full-queue and missing-ingredient messages. The twelve machine icon exports total 424,085 bytes, down from 1,266,201 bytes. Full keyboard/screen-reader and performance audits remain pending.

## 11. Verify and release in stages

- Run unit, integration, two-player, migration, and manual browser checks on a release candidate.
- Review content, art rights, economy changes, and rollback/backup steps. Deploy to a small group first and watch the metrics from step 1.
- Merge the tested branch into `master`, publish release notes, and monitor first-session and day-2 results.
- **Gate:** no open release-blocking defects; metrics are observable; rollback rehearsed. **Status:** a pinned GitHub Actions workflow now checks clean install, tests, generated reports, production dependency audit, and Docker build on pushes and pull requests. Branch work remains in progress, not ready to merge.

## 12. Iterate from actual player behavior

- Review the first staged-release data against the product brief. Fix the largest friction point, then retest.
- Keep the asset inventory, balance model, tests, and this roadmap updated as gameplay changes.
- **Gate:** next release priorities are chosen from player evidence, not only code inspection. **Status:** pending staged release.

### Current acceptance record

- 67 automated tests pass on the upgrade branch.
- New assets: coop, windmill, market, farmer, a shared seedling, individual art for all fifteen animal species and thirteen fruit-tree species, growing and ripe art for all thirty-six crops, all twelve factory machine sprites, and four hand-painted kitchen product icons. Five tree and fruit pairs from the source pack now have individual game assets. The generated art inventory shows 36/36 crops, 13/13 trees, 15/15 animals, and 12/12 machines with individual PNG art; 13/186 products have PNG or SVG icons.
- First-session guidance, mobile HUD, starter tax grace, persistent harvest collections, and fifty-nine replay-safe gameplay/economy routes are implemented.
- Player research, remaining interface and product art, ingredient-supply and achievable-order-rate modeling, route-level mutation test coverage, accessibility audit, staged release, and merge remain open. The client and server currently list the same 59 replay-safe POST routes.
