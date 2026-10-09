# Farm API operational checks

The farm API returns `x-request-id` on every `/farm/api/` response. Include this ID when investigating a failed player action; Fastify uses the same ID in request logs.

Mutation requests under `/farm/api/` must use `Content-Type: application/json`. Browser requests with a cross-site `Sec-Fetch-Site` value or an `Origin` that differs from the farm host and protocol are rejected before authentication can change farmer state. Keep the reverse proxy's forwarded protocol accurate for HTTPS traffic. The game client sends JSON from the farm origin.

Set `FARM_INTERNAL_SECRET` on the server to enable `GET /internal/farm/metrics`. Send that value in the `x-farm-secret` request header. The endpoint returns 404 when the secret is not configured, and 403 for an incorrect secret. Keep the secret out of client code and public dashboards.

The metrics snapshot contains process start time, uptime, `startupReadyMs`, total API requests, 4xx and 5xx counts, idempotent mutation replay count, and five latency buckets measured through response completion. `startupReadyMs` is measured from server startup before database setup through Fastify readiness. Counters reset on process restart; scrape them regularly and derive error rates and latency trends from deltas between samples. A restart appears as a new `startedAt` value. The endpoint omits player IDs, route names, and request bodies.

Example from a trusted host:

```sh
curl -H "x-farm-secret: $FARM_INTERNAL_SECRET" http://localhost:8090/internal/farm/metrics
```

This is a first operational baseline. Persisted metrics, alerts, external request cold-start timing, and a restore rehearsal still need release work.

## Backup and migration rehearsal

Before deploying a schema change, run this against the live data directory from a trusted host. Choose a new backup filename outside the data directory:

```sh
npm run db:rehearse -- /data /secure/backups/farm2-before-release.sqlite3
```

The command uses SQLite's online backup API, checks the backup's integrity, restores and migrates a temporary copy, checks its integrity again, and verifies that existing farmer, plot, inventory, and animal row counts are preserved. If the backup contains a farmer, it boots the game API against the restored copy and requests that farmer's state. It never opens the live database for writing. The backup remains at the path you supplied; the temporary restored copy is removed. The command refuses to overwrite an existing backup file. Successful output includes `"stateProbe":"passed"`; an empty database reports that the state probe was skipped.

For restore, stop the farm service first. Preserve the current `farm2.sqlite3` and its `-wal`/`-shm` files as an incident snapshot, then place the verified backup at the configured data directory as `farm2.sqlite3`. Start the service and check `PRAGMA integrity_check`, a farmer state request, and the operational metrics. Rehearse this sequence on staging before relying on it in production. Code rollback must use a version compatible with the restored schema.
