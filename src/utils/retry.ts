export async function fetchWithRetry(
  url: string,
  opts: Record<string, unknown> = {},
  retries = 3,
  backoffMs = 300,
  timeoutMs = 5000
): Promise<Response> {
  if (retries < 0) retries = 0;
  if (backoffMs < 0) backoffMs = 0;
  if (timeoutMs < 0) timeoutMs = 5000;

  let lastErr: unknown = undefined;
  
  for (let i = 0; i <= retries; i++) {
    try {
      // Add timeout to individual requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      const res = await fetch(url, { 
        cache: 'no-cache', 
        ...opts,
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (i < retries) {
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * backoffMs;
        const sleep = backoffMs * Math.pow(2, i) + jitter;
        await new Promise((r) => setTimeout(r, Math.min(sleep, 2000)));
      }
    }
  }
  
  const error = lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  // Add structured error information
  error.message = `Fetch failed after ${retries + 1} attempts: ${error.message}`;
  throw error;
}
