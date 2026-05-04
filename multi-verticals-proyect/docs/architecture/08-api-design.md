# 08 · Diseño de la API

> Stack: **OpenAPI (Schema-First)** + **Orval** + **Fastify** + **Zod** + **React Query**
> REST estándar. Diseño API-First con contratos predecibles, generación de tipos estricta y validación automática.

---

## Principios

- **URL semántica**: el recurso se entiende sin leer la documentación
- **Un endpoint, una responsabilidad**: sin endpoints "multipropósito"
- **Errores predecibles**: siempre el mismo formato, con código de error tipado
- **Versionado en la URL**: `/api/v1/...` — nunca en cabeceras
- **Paginación cursor-based**: más eficiente que offset para listas grandes

---

## Estructura base de URLs

```
/api/v1/
  verticals/                          # catálogo de verticales
  providers/                          # providers (público — sólo datos públicos)
  providers/:providerId/
    services/                         # catálogo de servicios del provider
    availability/                     # disponibilidad del provider
    reviews/                          # reviews públicas
  search/                             # búsqueda cross-vertical o por vertical
  contact/                            # iniciar contacto anónimo
  conversations/:conversationId/      # gestión de conversación

  # Rutas autenticadas del provider
  me/
    profile/
    customers/                        # clientes (datos cifrados — requiere DEK)
    customers/:customerId/
    services/
    listings/

  # Rutas autenticadas del consumer
  me/
    profile/
    interactions/
    trust-score/

  # Admin (platform_admin)
  admin/
    providers/
    moderation/
    verticals/
```

---

## Formato de respuesta estándar

**Éxito — recurso único:**

```json
{
  "data": {
    "id": "uuid",
    "type": "provider",
    "attributes": { ... }
  }
}
```

**Éxito — colección con paginación:**

```json
{
  "data": [ ... ],
  "meta": {
    "total": 142,
    "cursor": "eyJpZCI6Ijg3In0=",
    "hasMore": true
  }
}
```

**Error:**

```json
{
  "error": {
    "code": "PROVIDER_NOT_FOUND",
    "message": "El provider solicitado no existe",
    "field": null,
    "requestId": "req_abc123"
  }
}
```

---

## Códigos de error tipados

```typescript
// packages/shared-types/src/api-errors.ts

export const API_ERROR_CODES = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  MFA_REQUIRED: 'MFA_REQUIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Tenant
  TENANT_VIOLATION: 'TENANT_VIOLATION',

  // Recursos
  NOT_FOUND: 'NOT_FOUND',
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  VERTICAL_NOT_FOUND: 'VERTICAL_NOT_FOUND',

  // Validación
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',

  // Negocio
  PROVIDER_INACTIVE: 'PROVIDER_INACTIVE',
  CONTACT_LIMIT_REACHED: 'CONTACT_LIMIT_REACHED',
  REVIEW_ALREADY_EXISTS: 'REVIEW_ALREADY_EXISTS',
  REVIEW_WITHOUT_INTERACTION: 'REVIEW_WITHOUT_INTERACTION',

  // Sistema
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
```

---

## Paginación cursor-based

```typescript
// packages/kernel/src/pagination/cursor.ts

interface PaginationParams {
  cursor?: string; // base64(JSON({id, createdAt}))
  limit?: number; // máximo 50, defecto 20
}

interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    cursor: string | null; // null si no hay más páginas
    hasMore: boolean;
  };
}

// Query con cursor en PostgreSQL (más eficiente que OFFSET)
function buildCursorQuery(cursor?: string) {
  if (!cursor) return sql`1=1`; // primera página

  const { id, createdAt } = decodeCursor(cursor);
  // Keyset pagination: (created_at, id) como cursor compuesto
  return sql`
    (created_at, id) < (${createdAt}::timestamptz, ${id}::uuid)
  `;
}
```

---

## Validación y Tipado End-to-End (OpenAPI + Orval + Zod)

Utilizamos un enfoque **Schema-First**. Los esquemas no se escriben a mano en el backend, sino que se definen en un único archivo `openapi.yaml` y **Orval** genera el código tanto para el Frontend como para el Backend.

### 1. Definición en OpenAPI

```yaml
# packages/api-spec/openapi.yaml
paths:
  /api/v1/search:
    get:
      parameters:
        - name: radius
          in: query
          schema:
            type: number
            minimum: 100
            maximum: 50000
            default: 5000
```

### 2. Uso en el Backend (Fastify)

Orval autogenera los esquemas de Zod (incluyendo soporte para coerción de tipos en query params).

```typescript
// services/search-service/src/http/search.route.ts
import { getSearchQuerySchema } from '@allcoba/api-zod';

fastify.get(
  '/api/v1/search',
  {
    schema: {
      querystring: getSearchQuerySchema, // Generado automáticamente por Orval
    },
  },
  async (request, reply) => {
    // request.query ya está 100% tipado y validado
  },
);
```

### 3. Uso en el Frontend (React)

El Frontend consume el hook generado por Orval sin escribir llamadas fetch manuales.

```tsx
// apps/web/src/components/Search.tsx
import { useGetSearch } from '@allcoba/api-client-react';

function SearchComponent() {
  const { data, isLoading } = useGetSearch({ vertical: 'dating', radius: 1000 });
  // 'data' tiene tipado estricto basado en el openapi.yaml
}
```

---

## Cabeceras estándar en todas las respuestas

```typescript
// apps/api/src/plugins/response-headers.ts

fastify.addHook('onSend', async (request, reply) => {
  reply.header('X-Request-Id', request.id); // trazabilidad
  reply.header('X-Response-Time', `${Date.now() - request.startTime}ms`);
  reply.header('Cache-Control', 'no-store'); // datos personales — nunca cachear
});
```

---

## Endpoints principales documentados

### GET /api/v1/search

Búsqueda de providers por vertical y ubicación.

```
Query params:
  vertical  string   requerido   slug de la vertical ('hairdresser', 'real-estate'...)
  lat       number   opcional    latitud del usuario
  lng       number   opcional    longitud del usuario
  radius    number   opcional    radio en metros (defecto 5000, máx 50000)
  q         string   opcional    búsqueda full-text
  cursor    string   opcional    cursor de paginación
  limit     number   opcional    resultados por página (máx 50, defecto 20)

Respuesta 200:
  data[]:
    id, slug, displayName, addressText, distanceMeters,
    attributes (específicos de la vertical), services (resumen),
    trustScore (público), mediaUrls (primeras 3 fotos), isVerified
```

### POST /api/v1/contact

Iniciar contacto anónimo con un provider.

```
Body:
  providerId  UUID    requerido
  message     string  requerido  (máx 500 chars)
  vertical    string  requerido

Respuesta 201:
  conversationId  UUID
  expiresAt       ISO8601  (las conversaciones sin respuesta expiran en 7 días)

Notas:
  - El consumer es anónimo para el provider hasta que decide revelarse
  - El provider recibe una notificación push sin datos del consumer
```

### GET /api/v1/me/customers (requiere auth de provider + DEK activa)

```
Respuesta 200:
  data[]:
    id, consumerHash, tags (etiquetas IA),
    name (descifrado), phone (descifrado), email (descifrado),
    firstContactAt, lastContactAt, trustSignals (score público)
```
