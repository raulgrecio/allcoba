# 08 · Diseño de la API

> Stack: **Fastify** + **Zod** (validación) + **JSON Schema** (documentación automática)
> REST estándar. Sin GraphQL. Sin tRPC. Contratos predecibles y versionados.

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
  UNAUTHORIZED:              'UNAUTHORIZED',
  FORBIDDEN:                 'FORBIDDEN',
  MFA_REQUIRED:              'MFA_REQUIRED',
  SESSION_EXPIRED:           'SESSION_EXPIRED',

  // Tenant
  TENANT_VIOLATION:          'TENANT_VIOLATION',

  // Recursos
  NOT_FOUND:                 'NOT_FOUND',
  PROVIDER_NOT_FOUND:        'PROVIDER_NOT_FOUND',
  CUSTOMER_NOT_FOUND:        'CUSTOMER_NOT_FOUND',
  VERTICAL_NOT_FOUND:        'VERTICAL_NOT_FOUND',

  // Validación
  VALIDATION_ERROR:          'VALIDATION_ERROR',
  INVALID_PAYLOAD:           'INVALID_PAYLOAD',

  // Negocio
  PROVIDER_INACTIVE:         'PROVIDER_INACTIVE',
  CONTACT_LIMIT_REACHED:     'CONTACT_LIMIT_REACHED',
  REVIEW_ALREADY_EXISTS:     'REVIEW_ALREADY_EXISTS',
  REVIEW_WITHOUT_INTERACTION:'REVIEW_WITHOUT_INTERACTION',

  // Sistema
  INTERNAL_ERROR:            'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE:       'SERVICE_UNAVAILABLE',
} as const
```

---

## Paginación cursor-based

```typescript
// packages/kernel/src/pagination/cursor.ts

interface PaginationParams {
  cursor?: string  // base64(JSON({id, createdAt}))
  limit?: number   // máximo 50, defecto 20
}

interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    cursor: string | null  // null si no hay más páginas
    hasMore: boolean
  }
}

// Query con cursor en PostgreSQL (más eficiente que OFFSET)
function buildCursorQuery(cursor?: string) {
  if (!cursor) return sql`1=1`  // primera página

  const { id, createdAt } = decodeCursor(cursor)
  // Keyset pagination: (created_at, id) como cursor compuesto
  return sql`
    (created_at, id) < (${createdAt}::timestamptz, ${id}::uuid)
  `
}
```

---

## Validación de schemas con Zod + Fastify

```typescript
// apps/api/src/modules/providers/http/search.route.ts

const SearchQuerySchema = z.object({
  vertical: z.string().min(1),
  lat:      z.coerce.number().min(-90).max(90).optional(),
  lng:      z.coerce.number().min(-180).max(180).optional(),
  radius:   z.coerce.number().min(100).max(50000).default(5000),  // metros
  q:        z.string().max(100).optional(),
  cursor:   z.string().optional(),
  limit:    z.coerce.number().min(1).max(50).default(20),
})

fastify.get('/api/v1/search', {
  schema: {
    querystring: zodToJsonSchema(SearchQuerySchema),  // documentación automática
  },
}, async (request, reply) => {
  const query = SearchQuerySchema.parse(request.query)
  // ...
})
```

---

## Cabeceras estándar en todas las respuestas

```typescript
// apps/api/src/plugins/response-headers.ts

fastify.addHook('onSend', async (request, reply) => {
  reply.header('X-Request-Id', request.id)           // trazabilidad
  reply.header('X-Response-Time', `${Date.now() - request.startTime}ms`)
  reply.header('Cache-Control', 'no-store')           // datos personales — nunca cachear
})
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
