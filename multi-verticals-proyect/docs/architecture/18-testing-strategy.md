# 18 · Estrategia de testing

> Stack: **Vitest** + **Testcontainers** + **Playwright** (E2E web)
> Sin Jest. Sin Mocha. Sin Supertest — Vitest tiene fetch nativo para tests HTTP.

---

## Pirámide de tests

```text
                    ┌─────────┐
                    │   E2E   │  ← pocos, lentos, alto valor
                    │ (10-20) │     Playwright (web) + vitest fetch (API completa)
                  ┌─┴─────────┴─┐
                  │ Integration │  ← medios, PostgreSQL real via Testcontainers
                  │   (50-100)  │
                ┌─┴─────────────┴─┐
                │      Unit       │  ← muchos, rápidos, sin IO
                │    (200-500)    │     Dominio + use cases + utils
                └─────────────────┘

Cobertura mínima exigida:
  packages/domain/**        → 90%
  apps/api/src/application/ → 80%
  apps/api/src/infra/       → 60% (testeado principalmente por integration)
```

---

## Unit tests — dominio y use cases

Los tests unitarios no tocan base de datos, red, ni sistema de ficheros. Usan implementaciones en memoria de los ports (fakes, no mocks de librería).

```typescript
// packages/domain/src/provider/__tests__/provider.entity.test.ts
import { describe, expect, it } from 'vitest';

import { InvalidLocationError } from '../errors';
import { Provider } from '../provider.entity';

describe('Provider entity', () => {
  it('rechaza coordenadas fuera de rango', () => {
    expect(() => Provider.create({ lat: 91, lng: 0, ...minimalProps })).toThrow(
      InvalidLocationError,
    );
  });

  it('genera slug desde displayName si no se proporciona', () => {
    const p = Provider.create({ displayName: 'Salón Ángela Madrid', ...minimalProps });
    expect(p.slug).toBe('salon-angela-madrid');
  });
});
```

```typescript
// Fake in-memory del repositorio — implementa el port
// apps/api/src/tests/fakes/provider.repository.fake.ts
import type { Provider } from '@allcoba/domain';

import type { ProviderRepositoryPort } from '../../application/ports';

export class FakeProviderRepository implements ProviderRepositoryPort {
  private store = new Map<string, Provider>();

  async findById(id: string) {
    return this.store.get(id) ?? null;
  }
  async save(p: Provider) {
    this.store.set(p.id, p);
  }
  async findBySlug(slug: string) {
    return [...this.store.values()].find((p) => p.slug === slug) ?? null;
  }
}

// Uso en test de use case
describe('PublishListing use case', () => {
  it('activa el listing del provider y encola moderación de imágenes', async () => {
    const providerRepo = new FakeProviderRepository();
    const queue = new FakeQueue();

    await providerRepo.save(buildProvider({ id: 'p1', isActive: true }));

    const useCase = new PublishListingUseCase(providerRepo, queue);
    await useCase.execute({ providerId: 'p1', listing: buildListing() });

    expect(queue.jobs).toHaveLength(1);
    expect(queue.jobs[0].name).toBe('moderate-image');
  });
});
```

---

## Integration tests — PostgreSQL real

Se usa **Testcontainers** para levantar un contenedor de PostgreSQL limpio por suite de tests. No se usan mocks de BD — se prueba el SQL real.

```typescript
// apps/api/src/tests/setup/database.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

let container: StartedPostgreSqlContainer;

export async function setupTestDatabase() {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('marketplace_test')
    .start();

  const db = drizzle(container.getConnectionUri());

  // Aplicar todas las migraciones — mismo SQL que en producción
  await migrate(db, { migrationsFolder: './infra/migrations' });

  // Instalar extensiones
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS postgis`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  return { db, connectionUri: container.getConnectionUri() };
}

export async function teardownTestDatabase() {
  await container.stop();
}

export async function cleanDatabase(db: Database) {
  // Limpiar tablas en orden (respetando foreign keys)
  await db.execute(sql`TRUNCATE providers, agencies, verticals CASCADE`);
}
```

```typescript
// Ejemplo: test de búsqueda geoespacial
// apps/api/src/tests/integration/search.test.ts
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

describe('PostgresSearchAdapter', () => {
  let db: Database;
  let searchAdapter: PostgresSearchAdapter;

  beforeAll(async () => {
    ({ db } = await setupTestDatabase());
    searchAdapter = new PostgresSearchAdapter(db);
  });

  afterAll(() => teardownTestDatabase());
  beforeEach(() => cleanDatabase(db));

  it('devuelve providers ordenados por distancia', async () => {
    // Madrid centro: 40.4168, -3.7038
    await insertProvider(db, { lat: 40.4168, lng: -3.7038, name: 'Salón A' }); // 0m
    await insertProvider(db, { lat: 40.45, lng: -3.72, name: 'Salón B' }); // ~4km

    const results = await searchAdapter.searchProviders({
      vertical: 'hairdresser',
      location: { lat: 40.4168, lng: -3.7038 },
      radiusMeters: 10000,
    });

    expect(results.data[0].displayName).toBe('Salón A');
    expect(results.data[0].distanceMeters).toBeLessThan(10);
  });

  it('excluye providers fuera del radio', async () => {
    await insertProvider(db, { lat: 41.65, lng: -4.7234, name: 'Salón Valladolid' });

    const results = await searchAdapter.searchProviders({
      vertical: 'hairdresser',
      location: { lat: 40.4168, lng: -3.7038 },
      radiusMeters: 5000,
    });

    expect(results.data).toHaveLength(0);
  });
});
```

---

## Tests de seguridad (obligatorios en CI)

```typescript
// apps/api/src/tests/security/tenant-isolation.test.ts

describe('Tenant isolation — tests de seguridad', () => {
  it('provider A no puede leer clientes de provider B', async () => {
    const tokenA = await loginProvider(providerA);
    const res = await request(app)
      .get(`/api/v1/me/customers`)
      .set('Authorization', `Bearer ${tokenA}`);

    // Sólo ve sus propios clientes
    const ids = res.body.data.map((c: any) => c.providerId);
    expect(ids.every((id: string) => id === providerA.id)).toBe(true);
  });

  it('manipular providerId en query string no funciona', async () => {
    const tokenA = await loginProvider(providerA);
    const res = await request(app)
      .get(`/api/v1/me/customers?providerId=${providerB.id}`)
      .set('Authorization', `Bearer ${tokenA}`);

    // Ignora el query param — devuelve clientes de A
    const ids = res.body.data.map((c: any) => c.providerId);
    expect(ids.every((id: string) => id === providerA.id)).toBe(true);
  });

  it('acceso a ruta de otro provider devuelve 404', async () => {
    const tokenA = await loginProvider(providerA);
    const res = await request(app)
      .get(`/api/v1/providers/${providerB.id}/customers`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404); // no 403 — no revelar existencia
  });

  it('campos sensibles nunca aparecen en logs', async () => {
    const logSpy = vi.spyOn(logger, 'info');
    await loginProvider(providerA);

    const loggedObjects = logSpy.mock.calls.map(([obj]) => JSON.stringify(obj));
    const sensitiveFields = ['dek', 'kek', 'password', 'passwordHash', 'derivedKey'];

    for (const field of sensitiveFields) {
      expect(loggedObjects.some((log) => log.includes(field))).toBe(false);
    }
  });
});
```

---

## E2E tests

```typescript
// apps/web/tests/e2e/search.spec.ts
import { expect, test } from '@playwright/test';

test('búsqueda de peluquerías cerca de Madrid', async ({ page }) => {
  await page.goto('/peluquerias/madrid');
  await page.getByPlaceholder('Buscar...').fill('colorista');
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(page.getByTestId('provider-card')).toHaveCount({ min: 1 });
  await expect(page.getByTestId('map-marker')).toBeVisible();
});

test('contacto anónimo con un provider', async ({ page }) => {
  await page.goto('/peluquerias/madrid/salon-ejemplo');
  await page.getByRole('button', { name: 'Contactar' }).click();
  await page.getByLabel('Tu mensaje').fill('¿Tenéis disponibilidad esta semana?');
  await page.getByRole('button', { name: 'Enviar' }).click();

  await expect(page.getByText('Mensaje enviado')).toBeVisible();
  // El consumer permanece anónimo — no se muestra ningún dato personal
  await expect(page.getByText('Tu nombre')).not.toBeVisible();
});
```

---

## Configuración de Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        'packages/domain/**': { lines: 90, functions: 90 },
        'apps/api/src/application/': { lines: 80, functions: 80 },
      },
    },
    // Tests de integración son lentos — separarlos
    include: ['**/*.test.ts'],
    exclude: ['**/*.integration.test.ts', '**/*.e2e.test.ts'],
  },
});

// vitest.integration.config.ts — para CI, más lento
export const integrationConfig = defineConfig({
  test: {
    include: ['**/*.integration.test.ts'],
    testTimeout: 30000, // Testcontainers puede tardar en arrancar
    hookTimeout: 60000,
  },
});
```

---

## CI pipeline de tests

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: pnpm test:unit
      - run: pnpm test:coverage

  integration:
    runs-on: ubuntu-latest
    services:
      # Testcontainers levanta su propio PostgreSQL — este no se usa en tests
      # pero Docker debe estar disponible
      docker:
        image: docker:dind
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: pnpm test:integration
        env:
          TESTCONTAINERS_RYUK_DISABLED: 'true'

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: pnpm test:security # tests de tenant isolation
      - run: npm audit --audit-level=high # 0 vulnerabilidades high/critical
```
