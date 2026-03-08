import { env } from './env';
import { getApiPrefix, apiUrl } from './api-prefix';

const catalogUrl = env.catalog;
const authUrl = env.auth;

const getAuthToken = async (): Promise<string> => {
  const loginRes = await fetch(apiUrl(authUrl, '/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.TEST_USER_EMAIL ?? 'test@urbano.com',
      password: process.env.TEST_USER_PASSWORD ?? 'Test123!',
    }),
  });
  if (loginRes.status !== 200) {
    throw new Error('Login falló: asegúrate de tener un usuario test@urbano.com / Test123! o define TEST_USER_EMAIL y TEST_USER_PASSWORD');
  }
  const auth = await loginRes.json();
  return auth.access_token;
};

describe('E2E Catalog', () => {
  beforeAll(async () => {
    await getApiPrefix();
  }, 35000);

  it('GET /products devuelve 200 y array', async () => {
    const token = await getAuthToken();
    const res = await fetch(apiUrl(catalogUrl, '/products'),{
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('POST /products sin token devuelve 401', async () => {
    const res = await fetch(apiUrl(catalogUrl, '/products'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        description: 'Desc',
        price: 10,
        sku: 'E2E-SKU',
        categoryId: 'cat-e2e',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /products con token devuelve 201 y producto', async () => {
    const token = await getAuthToken();
    const res = await fetch(apiUrl(catalogUrl, '/products'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `Producto E2E ${Date.now()}`,
        description: 'E2E description',
        price: 99.99,
        sku: `E2E-${Date.now()}`,
        categoryId: 'cat-e2e',
      }),
    });
    expect(res.status).toBe(201);
    const product = await res.json();
    expect(product).toHaveProperty('id');
    expect(product).toHaveProperty('name');
    expect(product).toHaveProperty('sku');
  });
});
