// Gọi API server. Server là trọng tài: client chỉ gửi ý định và nhận trạng thái mới.
const BOOT = new URL(import.meta.url).searchParams.get('v') || '';
const WAKE_RETRIES = 20;
const WAKE_STATUSES = new Set([502, 503, 504]);

export const net = {
  boot: BOOT,
  clockOffset: 0, // server - client, ms (header Date có độ phân giải 1 giây)
  onWaking: null, // (attempt) => void, hiện "trại đang thức dậy"
  onStale: null, // () => void, server có bản mới
};

export const serverNow = () => Date.now() + net.clockOffset;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const newKey = () => crypto.randomUUID().replaceAll('-', '');

export class ApiError extends Error {
  constructor(status, code, data) {
    super(code || `http_${status}`);
    this.status = status;
    this.code = code || `http_${status}`;
    this.data = data;
  }
}

// Mọi POST mang Idempotency-Key: gửi lại khi mạng chập chờn không bao giờ tính hai lần.
export async function api(path, body) {
  const isMutation = body !== undefined;
  const key = isMutation ? newKey() : null;
  for (let attempt = 0; ; attempt += 1) {
    let res;
    try {
      res = await fetch(`/farm/api${path}`, {
        method: isMutation ? 'POST' : 'GET',
        headers: isMutation ? { 'content-type': 'application/json', 'idempotency-key': key } : undefined,
        body: isMutation ? JSON.stringify(body) : undefined,
        credentials: 'same-origin',
      });
    } catch (err) {
      if (attempt < WAKE_RETRIES) { net.onWaking?.(attempt); await sleep(2000); continue; }
      throw new ApiError(0, 'offline', null);
    }
    if (WAKE_STATUSES.has(res.status) && attempt < WAKE_RETRIES) { net.onWaking?.(attempt); await sleep(2000); continue; }
    const date = Date.parse(res.headers.get('date') || '');
    if (Number.isFinite(date)) net.clockOffset = date - Date.now();
    const boot = res.headers.get('x-farm-boot');
    if (boot && BOOT && boot !== BOOT) net.onStale?.();
    if (res.status === 304) return null;
    let data = null;
    try { data = await res.json(); } catch { /* không có thân JSON */ }
    if (!res.ok) throw new ApiError(res.status, data?.error, data);
    return data;
  }
}
