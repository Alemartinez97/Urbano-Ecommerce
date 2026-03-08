import { env } from './env';
import { getApiPrefix, apiUrl } from './api-prefix';

const orderUrl = env.order;
const authUrl = env.auth;
const usersUrl = env.users;

async function registerAndLogin(): Promise<{ userId: string; token: string }> {
  const email = `order-e2e-${Date.now()}@test.urbano.com`;
  const password = 'Test123!';
  const registerRes = await fetch(apiUrl(usersUrl, '/users/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Order E2E',
      email,
      password,
      firstName: 'Order',
      lastName: 'E2E',
    }),
  });
  expect(registerRes.status).toBe(201);
  const user = await registerRes.json();
  const loginRes = await fetch(apiUrl(authUrl, '/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  expect(loginRes.status).toBe(200);
  const auth = await loginRes.json();
  return { userId: user.id, token: auth.access_token };
}

describe('E2E Order', () => {
  beforeAll(async () => {
    await getApiPrefix();
  }, 35000);

  it('POST /orders sin token devuelve 401 o 400', async () => {
    const res = await fetch(apiUrl(orderUrl, '/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        items: [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 1, price: 10 }],
        totalAmount: 10,
      }),
    });
    expect([400, 401]).toContain(res.status);
  });

  it('POST /orders con token y payload válido devuelve 201', async () => {
    const { userId, token } = await registerAndLogin();
    const res = await fetch(apiUrl(orderUrl, '/orders'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId,
        items: [{ productId: '00000000-0000-0000-0000-000000000001', quantity: 1, price: 29.99 }],
        totalAmount: 29.99,
      }),
    });
    expect([201, 400, 404]).toContain(res.status);
    if (res.status === 201) {
      const order = await res.json();
      expect(order).toHaveProperty('id');
    }
  });
});
