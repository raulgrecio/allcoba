# 14 · Búsqueda y descubrimiento

> Stack: **PostgreSQL tsvector + GIN + PostGIS**
> Sin Elasticsearch. Sin Algolia. Migrable a Typesense/Meilisearch cambiando el adapter.

---

## Tipos de búsqueda

```
1. Búsqueda por proximidad        → "peluquerías cerca de mí"
2. Búsqueda full-text             → "peluquería colorista Madrid centro"
3. Búsqueda combinada (principal) → texto + ubicación + filtros de la vertical
4. Búsqueda por disponibilidad    → "que esté abierto ahora"
```

---

## Query principal de búsqueda

```sql
-- Búsqueda combinada: texto + geo + filtros + relevancia
WITH ranked_providers AS (
  SELECT
    p.id,
    p.slug,
    p.display_name,
    p.address_text,
    p.attributes,
    p.is_verified,
    p.availability,
    -- Distancia en metros (NULL si no se proporciona ubicación)
    CASE WHEN $lat IS NOT NULL
      THEN ST_Distance(p.location, ST_MakePoint($lng, $lat)::GEOGRAPHY)
      ELSE NULL
    END AS distance_meters,
    -- Relevancia full-text (0 si no hay término de búsqueda)
    CASE WHEN $search_query != ''
      THEN ts_rank_cd(p.search_vector, to_tsquery('spanish', $search_query))
      ELSE 0
    END AS text_relevance,
    -- Score de reputación normalizado
    COALESCE(ps.overall_score, 0) AS trust_score,
    ps.review_count
  FROM providers p
  LEFT JOIN provider_scores ps ON ps.provider_id = p.id
  WHERE
    p.vertical_id = $vertical_id
    AND p.is_active = true
    -- Filtro geográfico (sólo si se proporciona ubicación)
    AND CASE WHEN $lat IS NOT NULL
      THEN ST_DWithin(p.location, ST_MakePoint($lng, $lat)::GEOGRAPHY, $radius_meters)
      ELSE true
    END
    -- Filtro full-text (sólo si hay término de búsqueda)
    AND CASE WHEN $search_query != ''
      THEN p.search_vector @@ to_tsquery('spanish', $search_query)
      ELSE true
    END
    -- Filtros de atributos de la vertical (dinámicos)
    AND ($gender_focus IS NULL OR p.attributes->>'gender_focus' = $gender_focus)
    AND ($accepts_walkins IS NULL OR (p.attributes->>'accepts_walkins')::boolean = $accepts_walkins)
    -- Cursor para paginación
    AND CASE WHEN $cursor_distance IS NOT NULL
      THEN (ST_Distance(p.location, ST_MakePoint($lng, $lat)::GEOGRAPHY), p.id)
           > ($cursor_distance, $cursor_id::uuid)
      ELSE true
    END
)
SELECT *
FROM ranked_providers
ORDER BY
  -- Orden de relevancia combinado:
  -- 1. Verificados primero (boost)
  -- 2. Texto relevante (si hay búsqueda)
  -- 3. Distancia (si hay ubicación)
  -- 4. Trust score como desempate
  (CASE WHEN is_verified THEN 1 ELSE 0 END) DESC,
  (text_relevance * 0.4 + trust_score * 0.3) DESC,
  distance_meters ASC NULLS LAST,
  trust_score DESC
LIMIT $limit;
```

---

## Adapter de búsqueda (puerto)

```typescript
// packages/kernel/src/search/search.port.ts

export interface SearchPort {
  searchProviders(params: SearchParams): Promise<SearchResult>
  indexProvider(provider: Provider): Promise<void>
  removeProvider(providerId: string): Promise<void>
}

export interface SearchParams {
  vertical: string
  query?: string
  location?: { lat: number; lng: number }
  radiusMeters?: number
  filters?: Record<string, unknown>
  cursor?: string
  limit?: number
}

// El adapter de PostgreSQL implementa esta interfaz
// Si en el futuro se migra a Typesense, sólo cambia el adapter
export class PostgresSearchAdapter implements SearchPort {
  async searchProviders(params: SearchParams): Promise<SearchResult> {
    // Ejecuta la query SQL de arriba con los parámetros
  }
}
```

---

## Búsqueda con typos (fuzzy)

```sql
-- Para búsquedas cortas con posibles errores tipográficos
-- pg_trgm + similarity para fuzzy matching
SELECT p.id, p.display_name,
       similarity(p.display_name, $query) AS sim
FROM providers p
WHERE p.vertical_id = $vertical_id
  AND p.is_active = true
  AND similarity(p.display_name, $query) > 0.3
ORDER BY sim DESC
LIMIT 10;

-- Índice necesario:
CREATE INDEX idx_providers_trgm ON providers
  USING GIN(display_name gin_trgm_ops);
```
