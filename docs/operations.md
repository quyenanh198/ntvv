# Farm API operational checks

The farm API returns `x-request-id` on every `/farm/api/` response. Include this ID when investigating a failed player action; Fastify uses the same ID in request logs.

Mutation requests under `/farm/api/` must use `Content-Type: application/json`. Browser requests with a cross-site `Sec-Fetch-Site` value or an `Origin` that differs from the farm host and protocol are rejected before authentication can change farmer state. Keep the reverse proxy's forwarded protocol accurate for HTTPS traffic. The game client sends JSON from the farm origin.

Set `FARM_INTERNAL_SECRET` on the server to enable `GET /internal/farm/metrics`. Send that value in the `x-farm-secret` request header. The endpoint returns 404 when the secret is not configured, and 403 for an incorrect secret. Keep the secret out of client code and public dashboards.

The same secret protects `GET /internal/farm/funnel`. It reports aggregate counts for farmers first enrolled after this upgrade during the last 30 days: first plant, first harvest, first direct sale or order delivery, the number completing each within ten minutes, and returns between 24 and 48 hours after enrollment. The ten-minute denominator includes only farmers enrolled at least ten minutes ago; the return denominator includes only farmers enrolled at least 48 hours ago. Existing farmers are excluded because their earlier actions cannot be reconstructed reliably. The endpoint exposes no player identifiers. Scrape it regularly alongside operational metrics, and compare cohorts after enough time has elapsed; it does not substitute for observed play sessions.

`GET /internal/farm/economy` uses the same secret and returns persisted UTC daily sale totals for the last 30 calendar days. Direct sales are grouped by item family (`field_crop`, `tree_fruit`, `animal_product`, `processed_good`, `seafood`, or `other`); order rewards are grouped as `mixed_order` because an order can contain several families. Each row gives transaction count, item units, and gold credited. Rows have no player or item identifiers. Totals start when this version is deployed and cannot reconstruct earlier sales. An item can move between players before sale, so its family is not proof of where that seller produced it. Compare these totals with the balance scenarios before changing prices.

The metrics snapshot contains process start time, uptime, `startupReadyMs`, total API requests, 4xx and 5xx counts, idempotent mutation replay count, and five latency buckets measured through response completion. `startupReadyMs` is measured from server startup before database setup through Fastify readiness. Counters reset on process restart; scrape them regularly and derive error rates and latency trends from deltas between samples. A restart appears as a new `startedAt` value. The endpoint omits player IDs, route names, and request bodies.

Example from a trusted host:

```sh
curl -H "x-farm-secret: $FARM_INTERNAL_SECRET" http://localhost:8090/internal/farm/metrics
curl -H "x-farm-secret: $FARM_INTERNAL_SECRET" http://localhost:8090/internal/farm/economy
```

The capture tool below persists operational samples. Deployment of monitoring, alerts, external cold-start measurements, and a restore rehearsal still need release work.

## Persistent operational capture

From a trusted host with `FARM_INTERNAL_SECRET` set in its environment:

```sh
npm run ops:monitor -- https://farm.example.com /secure/monitor/farm.jsonl --once
npm run ops:monitor -- https://farm.example.com /secure/monitor/farm.jsonl --interval-ms=60000
```

The first command captures one sample and exits 0 only when health and protected metrics both succeed; failures exit 1. Continuous mode appends samples until SIGINT or SIGTERM. Each cycle probes public health first, then protected metrics, then waits the configured interval (default 60 seconds). Each request times out after 30 seconds; stopping during a request can take up to 60 seconds. Redirects are rejected so the secret cannot follow them. Use a URL without credentials, query parameters, or fragments.

JSONL and stdout contain allowlisted aggregate counters, health/probe status and elapsed milliseconds, startup readiness, and interval deltas: requests per second, 5xx fraction, and fraction above 1000 ms. These are bucket-based rates, not latency percentiles. The first public probe includes any wake-up delay observed from the monitoring host; it does not establish a cold-start benchmark. Failed probes retain no response bodies or raw network errors. Secrets are never written to samples.

The monitor resumes the latest valid sample for the same target from the final 256 KiB of the log, skipping failed samples and incomplete lines. A longer failure streak or log rotation can require a fresh baseline. Process restarts, counter decreases, and reversed clocks create new baselines rather than negative rates. Signals record unavailable probes and resets; they do not send alerts. Keep one writer per file, configure retention/rotation and service supervision externally, and protect both logs and stdout. The tool does not capture funnel/economy snapshots. A deployed collection and alerting rehearsal remains a release gate.

CI also starts the built production image with a disposable Docker volume. It checks `/healthz`, the protected metrics endpoint, the farm page, and a scene asset, then inserts a synthetic farmer, restarts the container, and confirms that SQLite row survives. This checks the packaged runtime and volume behavior; it does not replace a rehearsal against a copy of live data.

## Backup and migration rehearsal

Before deploying a schema change, run this against the live data directory from a trusted host. Choose a new backup filename outside the data directory:

```sh
npm run db:rehearse -- /data /secure/backups/farm2-before-release.sqlite3
```

The command uses SQLite's online backup API, checks the backup's integrity, restores and migrates a temporary copy, checks its integrity again, and verifies that existing farmer, plot, inventory, and animal row counts are preserved. If the backup contains a farmer, it boots the game API against the restored copy and requests that farmer's state. It never opens the live database for writing. The backup remains at the path you supplied; the temporary restored copy is removed. The command refuses to overwrite an existing backup file. Successful output includes `"stateProbe":"passed"`; an empty database reports that the state probe was skipped.

For restore, stop the farm service first. Preserve the current `farm2.sqlite3` and its `-wal`/`-shm` files as an incident snapshot, then place the verified backup at the configured data directory as `farm2.sqlite3`. Start the service and check `PRAGMA integrity_check`, a farmer state request, and the operational metrics. Rehearse this sequence on staging before relying on it in production. Code rollback must use a version compatible with the restored schema.

### Production-copy rehearsal record (2026-10-23)

Run on the Mac mini hub against a copy of the live data, taken while the farm container was asleep (stopped by Sablier), so the copy is consistent: `farm2.sqlite3` with its `-wal` and `-shm` files, checksum-matched to the live file. The live database was never opened.

| Check | Result |
| --- | --- |
| `npm run db:rehearse` with master code (`ef3f332`) | Backup integrity `ok`; upgraded copy integrity `ok`; rows preserved: 10 farmers, 800 plots, 804 inventory rows, 1,775 animals; `stateProbe: passed` |
| State of every farmer on the migrated copy (master code) | All 10 farmers return `GET /farm/api/state` 200, levels 10–255 |
| Code rollback: the previously deployed code (`6129526`) on the migrated copy | All 10 farmers return 200; integrity `ok`. Rolling the image back after the upgrade keeps the farm playable |
| Restore | The verified backup was restored into a fresh directory, migrated and served (the rehearsal itself); kept on the host at `$DATA_ROOT/backups/farm/farm2-2026-10-23-before-master.sqlite3` |

Not covered: a restore performed by stopping the live service (done at deployment time only if needed), and live traffic during migration (the service starts the migration itself on first wake).
