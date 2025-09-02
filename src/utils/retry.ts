export async function fetchWithRetry(
  url: string,
  opts: RequestInit = {},
  retries = 3,
  backoffMs = 300
): Promise<Response> {
  let lastErr: unknown = undefined;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { cache: 'no-cache', ...opts });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        const sleep = backoffMs * Math.pow(2, i);
        await new Promise((r) => setTimeout(r, sleep));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
