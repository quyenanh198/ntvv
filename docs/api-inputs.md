# Mutation target inputs

Game POST requests use a JSON object. Invalid body shapes or malformed target fields return HTTP 400 with `{"error":"bad_request"}` after the origin check and before farmer state is loaded or updated.

| Target | Accepted form | Examples |
| --- | --- | --- |
| Farmer, order, trade, request, reward, or fish-batch ID | Positive safe JSON integer | `{"ownerId":2}`, `{"id":1}` |
| Plot index | Safe JSON integer from zero through `MAX_PLOTS - 1`; individual routes also enforce ownership and availability | `{"idx":0}` |
| Crop, tree, animal, machine, recipe, item, collection, or skill key | String catalog ID | `{"crop":"luami"}` |
| Harvest-help mode | Boolean, with an index required when `all` is not true | `{"ownerId":2,"all":true}` or `{"ownerId":2,"idx":0}` |

Numeric strings, arrays, objects, nulls, fractions, and unsafe numbers do not select numeric targets. An explicit malformed `ownerId` cannot fall back to the caller's own farm. Catalog arrays such as `{"kind":["ga"]}` cannot be coerced into a valid ID.

Omitting `ownerId` from watering still selects the caller's farm. Omitting an animal kind from feed/collect still selects chickens. Omitting a recipe from machine collection or speedup retains the existing whole-machine/next-job behavior. The route's remaining rules, including catalog membership, ownership, unlocks, quantities, balance checks, and replay protection, still apply.

The mutation-target integration test rejects malformed targets across plot actions, social actions, gifts, requests, orders, rewards, purchases, and processing. It compares both farmers' state and affected tables after every rejection, then verifies both supported watering forms. Existing gameplay and replay suites exercise valid requests.

Gold gifts and requests require a JSON integer amount from 1 through 1,000,000,000; malformed amounts return `bad_amount` before farmer state changes. Dog hiring requires a numeric value from `DOG.hoursOptions`. Gift/request prompts reject invalid text instead of removing punctuation or signs and changing the amount. Integration coverage snapshots both farms after rejected amounts and hire durations; existing replay tests cover valid gifts, requests, and hires.

## Reviewed tree removal

`remove-tree` accepts optional `expectedVersion`, a non-negative safe integer copied from the farmer mutationVersion when reviewing removal. If current transactional state has a different version, the server returns HTTP 409 with state_changed before deleting the tree. A successful keyed retry still replays before the version check and cannot remove a replacement. Callers omitting the field retain the legacy contract.
