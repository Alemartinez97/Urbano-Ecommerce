function baseUrl(key: string, defaultVal: string): string {
  const raw = process.env[key] ?? defaultVal;
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

export const env = {
  catalog: baseUrl('TEST_CATALOG_URL', 'http://localhost:3001'),
  users: baseUrl('TEST_USERS_URL', 'http://localhost:3002'),
  auth: baseUrl('TEST_AUTH_URL', 'http://localhost:3003'),
  inventory: baseUrl('TEST_INVENTORY_URL', 'http://localhost:3004'),
  order: baseUrl('TEST_ORDER_URL', 'http://localhost:3005'),
};
