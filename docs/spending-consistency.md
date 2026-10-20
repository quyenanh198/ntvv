# Concurrent planting and animal spending

Planting and animal purchases read the farmer's current database row inside the journal transaction. This includes gold, tax debt, level, skills, and barn upgrades used by those actions. The earlier request snapshot remains suitable for identifying the player and building messages, but cannot authorize spending after another request has changed the balance.

`test/spending-contention.test.js` uses route hooks to hold two authenticated requests after both farmer snapshots load. It checks that both snapshots contain the same affordable balance before releasing the handlers together. This makes the stale-balance window deterministic.

| Competing actions with distinct request keys | Required result |
| --- | --- |
| Plant wheat in two different plots with one seed budget | One plot is planted and one request returns `not_enough_gold`. |
| Buy one chicken through each of the two purchase routes with one chicken budget | One animal is added and one request returns `not_enough_gold`. |
| Plant a crop while buying the maximum affordable chicken count with a budget that cannot fund both | Only the winning action changes ownership and gold. |

Each scenario verifies the exact remaining balance, plot or animal count, and the winning plot index where applicable. Replaying the winning request must leave gold, XP, mutation version, and ownership unchanged. The test covers the app's single-process SQLite transaction model; multi-process coordination remains outside this check.
