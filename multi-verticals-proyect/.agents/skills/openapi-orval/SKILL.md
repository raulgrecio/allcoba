---
name: openapi-orval
description: Cómo diseñar, implementar y consumir APIs usando OpenAPI y Orval en Allcoba (Enfoque Schema-First).
---

# Skill: Schema-First API Design (OpenAPI + Orval)

Esta Skill documenta cómo se diseñan, implementan y consumen las APIs en Allcoba. 
**Regla de Oro:** Nunca escribas un esquema de validación a mano en el Backend ni una llamada fetch a mano en el Frontend. Todo nace de `openapi.yaml`.

## When to Use
Usa esta skill cuando el usuario te pida crear una nueva ruta de API, modificar un endpoint existente, añadir parámetros a una búsqueda, o integrar una llamada al backend desde el frontend de React/Next.js.

---

## 1. El Contrato (OpenAPI)

Toda nueva funcionalidad debe definirse primero en el archivo `openapi.yaml`.
**Ruta:** `packages/api-spec/openapi.yaml` (o similar).

```yaml
# Ejemplo: Añadir un endpoint de búsqueda
paths:
  /api/v1/search:
    get:
      summary: Buscar recursos en una vertical
      parameters:
        - name: radius
          in: query
          description: Radio en metros
          schema:
            type: number
            minimum: 100
            maximum: 50000
            default: 5000
      responses:
        '200':
          description: Éxito
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/SearchResult'
```

---

## 2. Generación Automática (Orval)

Una vez actualizado el `openapi.yaml`, ejecutamos el generador.

```bash
# En la raíz del monorepo
pnpm run codegen
```

¿Qué ocurre internamente?
1. **Zod:** Orval lee el YAML y genera esquemas de validación Zod en `packages/api-zod`. Aplica `z.coerce` automáticamente a los parámetros que vengan por Query String.
2. **React Query:** Orval genera Hooks fuertemente tipados (`useGetSearch`, `useCreateListingMutation`) en `packages/api-client-react`.

---

## 3. Implementación en el Backend (Fastify)

En el servicio correspondiente (ej. `search-service`), usamos el esquema Zod autogenerado para proteger la ruta. Fastify rechazará automáticamente peticiones inválidas.

```typescript
// services/search-service/src/http/search.route.ts
import { getSearchQuerySchema } from '@allcoba/api-zod';

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.get('/search', {
    schema: {
      querystring: getSearchQuerySchema // Magia: Validación nativa de Fastify + Zod autogenerado
    }
  }, async (request, reply) => {
    // Aquí TypeScript ya sabe que request.query.radius es un número válido (100 - 50000)
    const { radius } = request.query;
    
    // Lógica de negocio (Capa de Aplicación / Repositorio)
    const results = await searchService.findInRadius(radius);
    return results;
  });
}
```

---

## 4. Consumo en el Frontend (React)

En el frontend (Next.js 15 App Router), utilizamos un **enfoque híbrido** para consumir la API de la forma más eficiente:

### A. Para SEO y carga inicial (Server Components)
Usamos las funciones de fetch puro (generadas por Orval) ejecutadas en el servidor.
```tsx
// apps/web/src/app/search/page.tsx (Server Component)
import { getSearch } from '@allcoba/api-client-react';

export default async function SearchPage({ searchParams }) {
  // Fetch nativo de Next.js ejecutado en el backend
  const data = await getSearch({ vertical: searchParams.vertical });
  // Renderizar HTML estático/SSR...
}
```

### B. Para interactividad extrema (Client Components)
Para mapas en tiempo real, chat o scroll infinito, usamos los hooks de **React Query** (generados por Orval) en componentes de cliente.
```tsx
// apps/web/src/components/MapRealTime.tsx (Client Component)
"use client"
import { useGetSearch } from '@allcoba/api-client-react';

export function MapRealTime() {
  // React Query maneja el polling, refetch en focus y caché en el navegador
  const { data, isLoading } = useGetSearch({ radius: 1000 }, { query: { refetchInterval: 5000 } });
  
  if (isLoading) return <MapSkeleton />;
  return <InteractiveMap markers={data} />;
}
```

---

## FAQ de esta Skill

- **¿Qué pasa si necesito añadir un campo obligatorio?** Lo añades en `openapi.yaml` (marcando `required: true`) y corres `pnpm run codegen`. Tu frontend fallará al compilar indicándote exactamente dónde te olvidaste pasar ese parámetro.
- **¿Cómo evitamos errores de TypeScript de "string vs number" en query params?** Orval está configurado para aplicar `z.coerce` a todo lo que provenga de Query y Path params, por lo que Zod convertirá el string de la URL a su tipo correcto antes de pasarlo a tu código.
