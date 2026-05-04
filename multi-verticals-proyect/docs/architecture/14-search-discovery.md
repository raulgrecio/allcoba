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
  searchProviders(params: SearchParams): Promise<SearchResult>;
  indexProvider(provider: Provider): Promise<void>;
  removeProvider(providerId: string): Promise<void>;
}

export interface SearchParams {
  vertical: string;
  query?: string;
  location?: { lat: number; lng: number };
  radiusMeters?: number;
  filters?: Record<string, unknown>;
  cursor?: string;
  limit?: number;
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

---

## Búsqueda semántica futura — pgvector (preparado, no activo)

La búsqueda actual (tsvector + geo) resuelve el 90% de los casos. Hay un caso que no resuelve bien: el usuario que busca con sus propias palabras sin usar los términos exactos del provider. Alguien que escribe "quiero ponerme guapa para una boda" no va a hacer match con "peinados nupciales" aunque signifiquen lo mismo.

pgvector resuelve esto con búsqueda semántica por similitud de embeddings. La ventaja clave frente a Pinecone u otro servicio externo es que **la búsqueda vectorial y la búsqueda relacional ocurren en la misma query y la misma transacción** — el "hybrid search problem" desaparece.

### Cuándo activar

Cuando los usuarios expresen que no encuentran lo que buscan con la búsqueda actual. La infraestructura está lista desde el día uno (extensión instalada, columna `embedding` en la tabla `providers`). Sólo hay que generar los embeddings y crear el índice HNSW.

### Cómo se combina con la búsqueda actual

```
Búsqueda actual (activa):
  tsvector @@ tsquery         → match exacto de términos
  + pg_trgm similarity        → tolerancia a typos
  + ST_DWithin                → filtro geográfico
  + filtros de atributos      → filtros de la vertical

Búsqueda futura (cuando se active):
  Todo lo anterior
  + embedding <=> query_vec   → similitud semántica (coseno)
  combinados en una puntuación ponderada
```

### Adapter ampliado del puerto de búsqueda

```typescript
// packages/kernel/src/search/search.port.ts — versión ampliada

export interface SearchParams {
  vertical: string;
  query?: string;
  queryEmbedding?: number[]; // se añade cuando el pipeline de embeddings esté activo
  location?: { lat: number; lng: number };
  radiusMeters?: number;
  filters?: Record<string, unknown>;
  cursor?: string;
  limit?: number;
}

// El adapter de PostgreSQL detecta si queryEmbedding está presente
// y elige automáticamente la query correcta:
//   sin embedding → búsqueda actual (tsvector + geo)
//   con embedding → búsqueda híbrida (tsvector + vector + geo)
// El resto del código (use cases, handlers) no cambia nada.
export class PostgresSearchAdapter implements SearchPort {
  async searchProviders(params: SearchParams): Promise<SearchResult> {
    if (params.queryEmbedding && params.queryEmbedding.length > 0) {
      return this.hybridSearch(params);
    }
    return this.textGeoSearch(params);
  }

  private async hybridSearch(params: SearchParams): Promise<SearchResult> {
    // Query combinada: semántica (40%) + texto (30%) + geo como filtro + trust score (30%)
    // Ver query completa en 01-database.md sección pgvector
  }

  private async textGeoSearch(params: SearchParams): Promise<SearchResult> {
    // Query actual: tsvector + geo + filtros de vertical
  }
}
```

### Modelo de embeddings

```
Modelo:    all-MiniLM-L6-v2
Licencia:  Apache 2.0 — sin restricciones comerciales
Tamaño:    ~80MB
Dimensiones: 384
Runtime:   ONNX Runtime (Node.js) — sin GPU, sin llamadas a red
Latencia:  ~15-25ms por embedding en CPU estándar
```

El modelo se ejecuta en el mismo worker de IA (`workers/ai-pipeline/`) que ya tiene ONNX Runtime instalado. Los embeddings se generan una vez por provider al crear o actualizar `bio` o `display_name`, y se almacenan en la columna `providers.embedding`. No se regeneran en cada búsqueda — sólo el embedding de la query del usuario se genera en tiempo real (~20ms, imperceptible).

### Índice HNSW — sólo cuando haya datos suficientes

```sql
-- Crear el índice HNSW cuando providers con embedding > 1000
-- Antes de ese volumen, un sequential scan sobre 384-dim vectors es suficientemente rápido
-- m=16: conexiones por nodo (más = más preciso, más RAM)
-- ef_construction=64: profundidad de búsqueda al construir (más = más preciso, más lento al indexar)
CREATE INDEX idx_providers_embedding ON providers
  USING hnsw(embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

---

## Búsqueda semántica — pgvector (preparada, no activa)

La búsqueda actual (tsvector + geo) cubre el 95% de los casos de uso iniciales. La búsqueda semántica se activa cuando los usuarios no encuentran lo que buscan con términos exactos — por ejemplo, buscar "look para boda" y encontrar peluquerías con servicio de recogidos aunque no usen esa palabra exacta en su ficha.

### Por qué pgvector y no Pinecone

Mantener vectores separados del resto de datos crea el "hybrid search problem": si necesitas resultados semánticamente similares a una query del usuario, pero sólo de providers en un radio de 5km con disponibilidad inmediata, tienes que cruzar resultados de dos sistemas distintos sobre la red. Con pgvector, la query entera — semántica + geo + filtros relacionales — se ejecuta en una sola transacción SQL.

### Modelo de embeddings

`all-MiniLM-L6-v2` — licencia MIT, 80MB, corre en CPU con ONNX Runtime (ya en el stack), latencia ~20ms por embedding. No requiere GPU ni servicio externo.

```
Texto del provider: displayName + bio + atributos principales
      │
      ▼ all-MiniLM-L6-v2 (ONNX, local)
      │
vector(384)  →  columna embedding en tabla providers
```

### Cuándo y cómo se generan los embeddings

```typescript
// workers/ai-pipeline/src/jobs/generate-embedding.ts

// Se encola automáticamente cuando:
//   1. Se crea un provider nuevo
//   2. El provider actualiza bio o display_name
// No se regenera en cada request — es una operación batch por cambio de datos

export async function generateProviderEmbedding(providerId: string): Promise<void> {
  const provider = await providerRepo.findById(providerId);

  // Construir texto representativo del provider para embeddir
  const text = [
    provider.displayName,
    provider.bio ?? '',
    Object.values(provider.attributes).join(' '),
    provider.services.map((s) => s.name).join(' '),
  ]
    .join('. ')
    .slice(0, 512); // límite de tokens del modelo

  const embedding = await embeddingAdapter.embed(text);

  await providerRepo.updateEmbedding(providerId, embedding);
}
```

### Búsqueda híbrida: tsvector + pgvector + geo

Esta es la query definitiva cuando se active. Todo ocurre en PostgreSQL — sin cruzar sistemas.

```sql
-- Hybrid search: semántica + texto exacto + geo + filtros relacionales
-- En una sola query, una sola transacción, cero red entre sistemas
SELECT
  p.id,
  p.slug,
  p.display_name,
  p.address_text,
  p.is_verified,
  -- Tres scores independientes que se combinan en el ORDER BY
  1 - (p.embedding <=> $query_embedding::vector)              AS semantic_score,
  ts_rank_cd(p.search_vector, to_tsquery('spanish', $query))  AS text_score,
  ST_Distance(p.location, ST_MakePoint($lng, $lat)::GEOGRAPHY) AS distance_meters
FROM providers p
LEFT JOIN provider_scores ps ON ps.provider_id = p.id
WHERE
  p.vertical_id   = $vertical_id
  AND p.is_active = true
  AND p.embedding IS NOT NULL   -- sólo providers con embedding generado
  -- Filtro geográfico relacional — se aplica ANTES del ranking vectorial
  AND ST_DWithin(
    p.location,
    ST_MakePoint($lng, $lat)::GEOGRAPHY,
    $radius_meters
  )
  -- Pre-filtro semántico: descartar vectores muy alejados antes del ranking fino
  -- Equivalente a un "umbral mínimo de relevancia semántica"
  AND (p.embedding <=> $query_embedding::vector) < 0.7
ORDER BY
  -- Puntuación combinada ponderada — pesos ajustables sin cambiar la query
  (
      (1 - (p.embedding <=> $query_embedding::vector)) * $weight_semantic   -- defecto 0.40
    + ts_rank_cd(p.search_vector, to_tsquery('spanish', $query)) * $weight_text  -- defecto 0.35
    + COALESCE(ps.overall_score, 0) / 5.0 * $weight_trust   -- defecto 0.25, normalizado 0-1
  ) DESC,
  -- Desempate por distancia y verificación
  (CASE WHEN p.is_verified THEN 0 ELSE 1 END) ASC,
  distance_meters ASC NULLS LAST
LIMIT $limit;
```

### Índice HNSW — sólo cuando haya volumen

```sql
-- HNSW (Hierarchical Navigable Small World): grafo multicapa para
-- approximate nearest neighbor. Navega de capas dispersas a densas,
-- minimizando cálculos de distancia. Resultados en milisegundos.
--
-- Crear sólo cuando haya >1000 providers con embedding — antes no merece la pena
CREATE INDEX idx_providers_embedding
  ON providers USING hnsw(embedding vector_cosine_ops)
  WITH (
    m = 16,              -- conexiones por nodo (más = más preciso, más RAM)
    ef_construction = 64 -- calidad de construcción (más = más lento al crear, más preciso)
  );

-- Sin el índice HNSW, pgvector hace sequential scan (válido hasta ~5000 providers)
-- Con el índice HNSW, escala a millones de vectores
```

### Port actualizado con búsqueda semántica

```typescript
// packages/kernel/src/search/search.port.ts — versión extendida

export interface SearchPort {
  searchProviders(params: SearchParams): Promise<SearchResult>;
  searchProvidersHybrid(params: HybridSearchParams): Promise<SearchResult>; // nueva
  indexProvider(provider: Provider): Promise<void>;
  removeProvider(providerId: string): Promise<void>;
}

export interface HybridSearchParams extends SearchParams {
  queryEmbedding: number[]; // vector 384-dim generado del texto de búsqueda
  weights?: {
    semantic: number; // defecto 0.40
    text: number; // defecto 0.35
    trust: number; // defecto 0.25
  };
}
```

### Cuándo activar

La búsqueda semántica se activa cuando se cumpla alguna de estas condiciones:

- Los usuarios usan el campo de búsqueda pero no encuentran resultados (tasa de "0 resultados" > 5%)
- Hay feedback explícito de que el buscador no entiende la intención
- El número de providers por vertical es suficiente (>200) para que los embeddings aporten diversidad

La activación no requiere cambios en la API ni en el frontend — sólo cambiar el adapter de búsqueda de `PostgresSearchAdapter` a `PostgresHybridSearchAdapter`, y lanzar el job de generación de embeddings para todos los providers existentes.
