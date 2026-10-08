# Farm API operational checks

The farm API returns `x-request-id` on every `/farm/api/` response. Include this ID when investigating a failed player action; Fastify uses the same ID in request logs.

Set `FARM_INTERNAL_SECRET` on the server to enable `GET /internal/farm/metrics`. Send that value in the `x-farm-secret` request header. The endpoint returns 404 when the secret is not configured, and 403 for an incorrect secret. Keep the secret out of client code and public dashboards.

The metrics snapshot contains process start time, uptime, total API requests, 4xx and 5xx counts, idempotent mutation replay count, and five latency buckets measured through response completion. Counters reset on process restart; scrape them regularly and derive error rates and latency trends from deltas between samples. A restart appears as a new `startedAt` value. The endpoint omits player IDs, route names, and request bodies.

Example from a trusted host:

```sh
curl -H "x-farm-secret: $FARM_INTERNAL_SECRET" http://localhost:8090/internal/farm/metrics
```

This is a first operational baseline. Cold-start duration, persistent metrics, alerts, and a restore rehearsal still need release work.
