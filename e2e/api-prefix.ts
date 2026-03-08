import { env } from './env';

let cached: string | null = null;

export async function getApiPrefix(maxAttempts = 30): Promise<string> {
  if (cached !== null) return cached;
  const base = env.catalog.replace(/\/$/, '');
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      let res = await fetch(`${base}/api/health`);
      if (res.status === 200) {
        cached = '/api';
        return cached;
      }
      res = await fetch(`${base}/health`);
      if (res.status === 200) {
        cached = '';
        return cached;
      }
    } catch {
      // connection refused or network error – service may still be starting
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(
    `Catalog at ${base} did not respond 200 to /api/health or /health after ${maxAttempts}s. Run: docker-compose up -d --build`
  );
}

export function apiUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${cached ?? '/api'}${p}`;
}
