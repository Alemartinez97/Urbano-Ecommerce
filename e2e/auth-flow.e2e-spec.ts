import { env } from './env';
import { getApiPrefix, apiUrl } from './api-prefix';

const usersUrl = env.users;
const authUrl = env.auth;

describe('E2E Auth flow', () => {
  beforeAll(async () => {
    await getApiPrefix();
  }, 35000);

  const email = `e2e-${Date.now()}@test.urbano.com`;
  const password = 'TestPass123!';

  it('registra usuario y luego login devuelve token', async () => {
    const registerRes = await fetch(apiUrl(usersUrl, '/users/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'E2E User',
        email,
        password,
        firstName: 'E2E',
        lastName: 'Test',
      }),
    });
    expect(registerRes.status).toBe(201);
    const user = await registerRes.json();
    expect(user).toHaveProperty('id');
    expect(user.email).toBe(email);

    const loginRes = await fetch(apiUrl(authUrl, '/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(loginRes.status).toBe(200);
    const auth = await loginRes.json();
    expect(auth).toHaveProperty('access_token');
    expect(typeof auth.access_token).toBe('string');
  });

  it('login con credenciales inválidas devuelve 401 o 400', async () => {
    const res = await fetch(apiUrl(authUrl, '/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'noexiste@test.com', password: 'wrong' }),
    });
    expect([400, 401]).toContain(res.status);
  });
});
