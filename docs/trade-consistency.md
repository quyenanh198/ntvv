# Trade consistency checks

The trade board holds a buyer's gold in escrow until sellers fill the request or the buyer cancels its remaining quantity. These checks run against the real Fastify routes and a temporary SQLite database in CI.

| Scenario | Required result |
| --- | --- |
| Two sellers request the final unit with different request keys | One succeeds; one receives `no_want`. Only the winning seller loses an item and receives gold. |
| A one-unit fill competes with cancellation of a two-unit request | Cancellation returns only the unfilled escrow. A completed fill remains with the buyer and its payment remains with the seller. |
| Cancellation is submitted before the competing fill | A cancelled request cannot subsequently transfer items or pay a seller. |
| Database closes and reopens before all original requests are repeated | Successful requests replay their financial outcomes; unsuccessful fills remain rejected. No request recreates a closed listing or changes settled balances, inventory, sales totals, or mutation versions. |

`test/trade-contention.test.js` verifies exact per-player gold and wheat changes. At every settled stage, total player gold plus remaining escrow equals the initial total, and total wheat across all players is unchanged. It submits both fill/cancel scheduling orders; the assertions accept whichever valid operation wins in the asynchronous request pipeline.

Existing retry coverage remains in `test/social-economy.test.js`; the mobile two-client walkthrough covers the player-facing listing and sale flow. These tests cover the app's single-process SQLite transaction model. They do not establish multi-process database coordination or observed-player usability.
