#!/usr/bin/env bash
set -euo pipefail

container="ntvv-ci-$$"
volume="ntvv-ci-data-$$"
secret="ci-container-smoke-secret"
base="http://127.0.0.1:18090"

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker volume rm "$volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker volume create "$volume" >/dev/null
docker run -d --name "$container" -p 127.0.0.1:18090:8090 \
  -e "FARM_INTERNAL_SECRET=$secret" -v "$volume:/data" ntvv-verify >/dev/null

wait_for_health() {
  for attempt in {1..40}; do
    if curl --fail --silent "$base/healthz" >/dev/null; then return 0; fi
    sleep 1
  done
  docker logs "$container"
  echo 'Production container did not become healthy' >&2
  return 1
}

check_endpoints() {
  curl --fail --silent "$base/healthz" | node -e 'let s=""; process.stdin.on("data", x => s += x).on("end", () => { if (JSON.parse(s).ok !== true) process.exit(1); })'
  curl --fail --silent -H "x-farm-secret: $secret" "$base/internal/farm/metrics" |
    node -e 'let s=""; process.stdin.on("data", x => s += x).on("end", () => { const m=JSON.parse(s); if (!Number.isFinite(m.startupReadyMs) || m.startupReadyMs < 0) process.exit(1); })'
  test "$(curl --silent --output /dev/null --write-out '%{http_code}' -H 'x-farm-secret: wrong' "$base/internal/farm/metrics")" = 403
  curl --fail --silent "$base/farm/" >/dev/null
  curl --fail --silent "$base/farm/assets/scene-v3/fishing_pond_v3.png" >/dev/null
}

wait_for_health
check_endpoints
docker exec "$container" node --input-type=module -e '
  import Database from "better-sqlite3";
  const db = new Database("/data/farm2.sqlite3");
  db.prepare("INSERT INTO farmers (user_id, name, gold, gems, plots_count, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(987654321, "CI farmer", 500, 50, 12, Date.now());
  db.close();
'
docker restart "$container" >/dev/null
wait_for_health
check_endpoints
docker exec "$container" node --input-type=module -e '
  import Database from "better-sqlite3";
  const db = new Database("/data/farm2.sqlite3", { readonly: true });
  const farmer = db.prepare("SELECT name, gold, plots_count FROM farmers WHERE user_id = ?").get(987654321);
  if (farmer?.name !== "CI farmer" || farmer.gold !== 500 || farmer.plots_count !== 12) process.exit(1);
  db.close();
'
echo 'Production container smoke passed, including restart and SQLite persistence.'
