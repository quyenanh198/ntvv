# Farm API operational checks

The farm API returns `x-request-id` on every `/farm/api/` response. Include this ID when investigating a failed player action; Fastify uses the same ID in request logs.

Set `FARM_INTERNAL_SECRET` on the server to enable `GET /internal/farm/metrics`. Send that value in the `x-farm-secret` request header. The endpoint returns 404 when the secret is not configured, and 403 for an incorrect secret. Keep the secret out of client code and public dashboards.

The metrics snapshot contains process start time, uptime, total API requests, 4xx and 5xx counts, idempotent mutation replay count, and five latency buckets measured through response completion. Counters reset on process restart; scrape them regularly and derive error rates and latency trends from deltas between samples. A restart appears as a new `startedAt` value. The endpoint omits player IDs, route names, and request bodies.

Example from a trusted host:

```sh
curl -H "x-farm-secret: $FARM_INTERNAL_SECRET" http://localhost:8090/internal/farm/metrics
```

This is a first operational baseline. Cold-start duration, persistent metrics, alerts, and a restore rehearsal still need release work.

## Backup and migration rehearsal

Before deploying a schema change, run this against the live data directory from a trusted host. Choose a new backup filename outside the data directory:

```sh
npm run db:rehearse -- /data /secure/backups/farm2-before-release.sqlite3
```

The command uses SQLite's online backup API, checks the backup's integrity, migrates a temporary copy, checks its integrity again, and verifies that existing farmer, plot, inventory, and animal row counts are preserved. It never opens the live database for writing. The backup remains at the path you supplied; the temporary migrated copy is removed. The command refuses to overwrite an existing backup file.

For restore, stop the farm service first. Preserve the current `farm2.sqlite3` and its `-wal`/`-shm` files as an incident snapshot, then place the verified backup at the configured data directory as `farm2.sqlite3`. Start the service and check `PRAGMA integrity_check`, a farmer state request, and the operational metrics. Rehearse this sequence on staging before relying on it in production. Code rollback must use a version compatible with the restored schema.
