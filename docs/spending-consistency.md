# Concurrent planting and animal spending

Planting and animal purchases read the farmer's current database row inside the journal transaction. This includes gold, tax debt, level, skills, and barn upgrades used by those actions. The earlier request snapshot remains suitable for identifying the player and building messages, but cannot authorize spending after another request has changed the balance.

`test/spending-contention.test.js` uses route hooks to hold two authenticated requests after both farmer snapshots load. It checks that both snapshots contain the same affordable balance before releasing the handlers together. This makes the stale-balance window deterministic.

| Competing actions with distinct request keys | Required result |
| --- | --- |
| Plant wheat in two different plots with one seed budget | One plot is planted and one request returns `not_enough_gold`. |
| Buy one chicken through each of the two purchase routes with one chicken budget | One animal is added and one request returns `not_enough_gold`. |
| Plant a crop while buying the maximum affordable chicken count with a budget that cannot fund both | Only the winning action changes ownership and gold. |
| Upgrade chickens through the generic and legacy routes with one first-upgrade budget | One level increase, one exact debit, and one `not_enough_gold` rejection. |
| Stock one fish and stock the maximum simultaneously with one pond slot left and gold for both | One fish is added, one seed price is debited, and the other request returns `pond_full`. |

Each scenario verifies the exact remaining balance, plot or animal count, and the winning plot index where applicable. Replaying the winning request must leave gold, XP, mutation version, and ownership unchanged. The test covers the app's single-process SQLite transaction model; multi-process coordination remains outside this check.

The upgrade case checks both routes share the same persisted chicken-barn level. The pond case starts with a batch occupying all but one slot and verifies the resulting total and batch count, so sufficient gold cannot bypass shared capacity. Both winning requests replay without changing balances, upgrade levels, or stocked batches.

## Factory speed across overlapping requests

Factory queueing and collection now read current farmer state inside the journal transaction, including machine upgrades and learned production skills. `test/factory-speed-contention.test.js` holds a request after authentication, commits an upgrade through the real API, then releases the older request. It covers individual and bulk queueing/collection plus both legacy mill shortcuts. Queue checks verify the new ready time and ingredient debit; collection checks distinguish two completed batches at the new speed from one at the old speed. Winning retries preserve inventory, jobs, gold, XP and mutation version. This verifies committed upgrade ordering in the single-process transaction model.

## Upgrade unlock enforcement

Machine and barn upgrades, including the legacy chicken shortcut, now compare the current transaction row against the catalog unlock level before checking upgrade cost. `test/upgrade-unlocks.test.js` verifies every machine and animal catalog entry rejects a funded level-one caller without changing gold, sunk gold, XP, mutation version, upgrade state or journal records. It then upgrades a machine, a JSON-backed quail barn and the legacy coop at their exact unlock levels, reusing their previously rejected keys, and verifies exact debit, new level and unchanged retries. This aligns direct API calls with the locked controls in the UI.

## Bulk planting and manual production

Bulk crop/tree planting now reads current balance, tax, level, plot capacity and skills inside its journal transaction. The held-request spending test includes individual versus bulk crop planting with one seed budget and individual versus bulk tree planting with one tree budget; only one request may spend or plant, and winning retries preserve value. Manual feeding also reads current farmer state and applies the same animal-speed formula used by automatic tending. The production test covers all fifteen species with zero and two speed ranks, two animals per request, exact feed consumption, shared adjusted deadlines and unchanged retries.

## Sale quotes and current selling skills

A shared server quote calculation supplies inventory estimates and committed sale proceeds. Sales reload the farmer inside the journal transaction so a skill learned after request authentication still applies. `test/sale-price-quotes.test.js` holds animal/processed sales while learning the real selling skill, verifies credit and safe retry, then checks saturated quotes against actual proceeds for animal, processed and crop items. Base inventory/net-worth valuation remains unchanged and is labeled as such in the UI.
