import { env } from './env';
import { getApiPrefix, apiUrl } from './api-prefix';

const services = [
  { name: 'catalog', url: env.catalog },
  { name: 'users', url: env.users },
  { name: 'auth', url: env.auth },
  { name: 'inventory', url: env.inventory },
  { name: 'order', url: env.order },
] as const;

describe('E2E Health', () => {
  beforeAll(async () => {
    await getApiPrefix();
  }, 35000);

  for (const { name, url } of services) {
    it(`${name}-service responde 200 en GET /health`, async () => {
      const res = await fetch(apiUrl(url, '/health'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('status', 'ok');
      expect(body).toHaveProperty('service');
      expect(body.service).toContain(name);
    });
  }
});
