# 01 · Base de datos

> Stack: **PostgreSQL 16** + **PostGIS** + **pgcrypto** + **pgvector** + **Drizzle ORM**
> Sin Redis. Sin Elasticsearch. Sin Pinecone. Sin licencias. Todo en un solo motor hasta que el volumen exija otra cosa.

---

## Principio rector

PostgreSQL hace el trabajo de seis herramientas: base de datos relacional, cola de jobs (SKIP LOCKED), búsqueda full-text (tsvector + GIN), geolocalización (PostGIS), cifrado de columnas (pgcrypto), y base de datos vectorial para búsqueda semántica (pgvector). Cada una de estas capacidades se abstrae detrás de un puerto (interfaz TypeScript) para poder sustituirla sin tocar el dominio.

---

## Extensiones requeridas

```sql
CREATE EXTENSION IF NOT EXISTS postgis;       -- geo queries
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- cifrado AES-256-GCM por columna
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- similaridad de texto para fuzzy search
CREATE EXTENSION IF NOT EXISTS unaccent;      -- búsquedas sin tildes
CREATE EXTENSION IF NOT EXISTS vector;        -- pgvector: embeddings y búsqueda semántica
```

> `pgvector` se instala desde el inicio aunque no se use todavía. Coste cero en instalación,
> y evita una migración disruptiva cuando se active la búsqueda semántica (ver sección final).

---

## Esquema de base de datos

### Convenciones globales

- Todas las tablas tienen `id UUID DEFAULT gen_random_uuid() PRIMARY KEY`
- `created_at TIMESTAMPTZ DEFAULT now()` y `updated_at TIMESTAMPTZ DEFAULT now()` en todas las tablas
- Nombres en `snake_case`
- Columnas con datos personales tienen el sufijo `_enc` — son `BYTEA`, cifradas con pgcrypto
- Nunca se usa `SERIAL` ni `BIGSERIAL` — siempre UUID

---

### Tablas globales (cross-tenant)

```sql
-- Verticales del marketplace
CREATE TABLE verticals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,           -- 'hairdresser', 'real-estate', 'car'
  name        TEXT NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',    -- atributos dinámicos de la vertical
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Providers (vendedores/negocios)
CREATE TABLE providers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id     UUID NOT NULL REFERENCES verticals(id),
  slug            TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  bio             TEXT,
  location        GEOGRAPHY(Point, 4326),       -- PostGIS: lat/lng
  address_text    TEXT,                          -- dirección legible para mostrar
  attributes      JSONB NOT NULL DEFAULT '{}',  -- atributos específicos de la vertical
  is_active       BOOLEAN DEFAULT true,
  is_verified     BOOLEAN DEFAULT false,
  agency_id       UUID REFERENCES agencies(id), -- NULL si es independiente
  plan            TEXT DEFAULT 'free',          -- 'free' | 'basic' | 'pro'
  search_vector   TSVECTOR,                     -- actualizado por trigger
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_providers_location    ON providers USING GIST(location);
CREATE INDEX idx_providers_vertical    ON providers(vertical_id) WHERE is_active = true;
CREATE INDEX idx_providers_search      ON providers USING GIN(search_vector);
CREATE INDEX idx_providers_agency      ON providers(agency_id) WHERE agency_id IS NOT NULL;

-- Trigger para mantener search_vector actualizado
CREATE OR REPLACE FUNCTION update_provider_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish',
    coalesce(NEW.display_name, '') || ' ' ||
    coalesce(NEW.bio, '') || ' ' ||
    coalesce(NEW.address_text, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_provider_search
  BEFORE INSERT OR UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION update_provider_search_vector();

-- Agencias (grupos de providers)
CREATE TABLE agencies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  location      GEOGRAPHY(Point, 4326),
  address_text  TEXT,
  attributes    JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Trust signals globales (anonimizados, cross-tenant)
-- Nunca contienen datos personales del consumer
CREATE TABLE trust_signal_contributions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_hash   TEXT NOT NULL,    -- SHA-256(consumer_id || platform_salt) — no reversible
  delta           NUMERIC(5,4) NOT NULL,  -- contribución normalizada con ruido diferencial
  dimension       TEXT NOT NULL,    -- 'punctuality' | 'payment' | 'communication'
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_trust_consumer ON trust_signal_contributions(consumer_hash);

-- Score agregado por consumer (materializado para velocidad de consulta)
CREATE TABLE trust_scores (
  consumer_hash     TEXT PRIMARY KEY,
  punctuality_score NUMERIC(3,2) DEFAULT 0,
  payment_score     NUMERIC(3,2) DEFAULT 0,
  communication_score NUMERIC(3,2) DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  last_updated      TIMESTAMPTZ DEFAULT now()
);
```

### Tablas por provider (datos de clientes — aisladas)

Cada provider tiene su propio schema en PostgreSQL: `provider_{provider_id}`.

```sql
-- Ejecutado al crear cada provider
CREATE SCHEMA provider_{id};

-- Clientes del provider (datos PII cifrados con su DEK)
CREATE TABLE provider_{id}.customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consumer_hash     TEXT NOT NULL UNIQUE,   -- hash global para trust signals
  name_enc          BYTEA,                  -- pgp_sym_encrypt(name, dek)
  phone_enc         BYTEA,
  email_enc         BYTEA,
  notes_enc         BYTEA,                  -- notas privadas del provider
  tags              JSONB DEFAULT '{}',     -- etiquetas IA — sin PII
  first_contact_at  TIMESTAMPTZ DEFAULT now(),
  last_contact_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Conversaciones (contenido cifrado)
CREATE TABLE provider_{id}.conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID NOT NULL REFERENCES provider_{id}.customers(id),
  content_enc  BYTEA NOT NULL,   -- JSON cifrado: [{role, message, ts}]
  status       TEXT DEFAULT 'active',  -- 'active' | 'archived'
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Catálogo de servicios del provider
CREATE TABLE provider_{id}.services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  description  TEXT,
  price_cents  INTEGER,          -- NULL si precio variable
  duration_min INTEGER,          -- duración estimada en minutos
  is_package   BOOLEAN DEFAULT false,
  is_active    BOOLEAN DEFAULT true,
  attributes   JSONB DEFAULT '{}',  -- atributos específicos de la vertical
  created_at   TIMESTAMPTZ DEFAULT now()
);
```

---

## Cola de jobs sin Redis

```sql
-- Tabla de cola — pg-boss la gestiona internamente
-- Se documenta aquí para entender el patrón SKIP LOCKED
CREATE TABLE job_queue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_name  TEXT NOT NULL,
  payload     JSONB NOT NULL,
  status      TEXT DEFAULT 'pending',  -- 'pending' | 'active' | 'completed' | 'failed'
  attempts    INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  run_at      TIMESTAMPTZ DEFAULT now(),
  started_at  TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_jobs_queue_status ON job_queue(queue_name, status, run_at)
  WHERE status = 'pending';

-- Query que usan los workers — SKIP LOCKED evita bloqueos entre workers concurrentes
-- pg-boss genera esta query internamente; se muestra para entender el patrón
SELECT * FROM job_queue
WHERE queue_name = $1
  AND status = 'pending'
  AND run_at <= now()
ORDER BY run_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

---

## Búsqueda full-text

```sql
-- Query de búsqueda por vertical y ubicación combinada
SELECT
  p.id,
  p.display_name,
  p.address_text,
  ST_Distance(p.location, ST_MakePoint($lng, $lat)::GEOGRAPHY) AS distance_meters,
  ts_rank(p.search_vector, query) AS relevance
FROM providers p,
     to_tsquery('spanish', $search_term) query
WHERE p.vertical_id = $vertical_id
  AND p.is_active = true
  AND p.search_vector @@ query
  AND ST_DWithin(p.location, ST_MakePoint($lng, $lat)::GEOGRAPHY, $radius_meters)
ORDER BY
  ts_rank(p.search_vector, query) DESC,
  distance_meters ASC
LIMIT 20 OFFSET $offset;
```

---

## Estrategia de índices para consultas ULTRA rápidas

Las consultas más frecuentes son búsqueda por vertical + geo. El índice GIST en `location` con filtro por `vertical_id` es el más crítico. En tablas de customers por provider, el índice más usado es `consumer_hash` para lookups de trust signals.

Regla: **ningún endpoint de lectura puede hacer un sequential scan en producción**. Toda query nueva requiere un `EXPLAIN ANALYZE` antes de mergear.

---

## Tabla de eventos / actividad (BRIN index)

Las tablas de eventos crecen de forma append-only y secuencial — exactamente el caso donde el índice BRIN supera al B-tree estándar en varios órdenes de magnitud. Un BRIN sólo almacena el valor mínimo y máximo de `created_at` por bloque físico de disco, lo que lo hace microscópico comparado con un B-tree sobre los mismos datos.

```sql
-- Tabla de eventos de actividad (logins, contactos, views de ficha...)
-- Nunca se actualiza — sólo INSERT
CREATE TABLE activity_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT NOT NULL,      -- 'provider.viewed' | 'contact.initiated' | 'login' ...
  actor_id    UUID,               -- provider_id o consumer_hash (nunca PII directo)
  actor_role  TEXT,               -- 'provider' | 'consumer'
  vertical    TEXT,
  metadata    JSONB DEFAULT '{}', -- datos adicionales sin PII
  created_at  TIMESTAMPTZ DEFAULT now()  -- siempre creciente — clave para BRIN
) PARTITION BY RANGE (created_at);  -- partición mensual

-- Partición mensual: PostgreSQL sólo toca la partición del mes consultado
CREATE TABLE activity_events_2025_01
  PARTITION OF activity_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Índice BRIN: almacena sólo min/max de created_at por bloque físico
-- Ocupa ~100x menos espacio que un B-tree equivalente
-- Eficiente porque los datos se insertan en orden cronológico
CREATE INDEX idx_activity_brin ON activity_events
  USING BRIN(created_at) WITH (pages_per_range = 128);

-- Para queries de rango temporal (dashboards, analytics)
-- PostgreSQL descarta particiones y bloques enteros sin leerlos
SELECT event_type, count(*)
FROM activity_events
WHERE created_at >= now() - INTERVAL '7 days'
  AND vertical = 'hairdresser'
GROUP BY event_type;
```

---

## pgvector — Embeddings para búsqueda semántica (preparado, no activo)

La extensión `vector` está instalada desde el inicio. La columna `embedding` en providers se añade en la migración inicial pero permanece vacía (`NULL`) hasta que se active el pipeline de generación de embeddings.

```sql
-- Añadir columna de embedding a providers (migración inicial, datos NULL)
ALTER TABLE providers
  ADD COLUMN embedding vector(384);  -- 384 dims: modelo all-MiniLM-L6-v2 (open source, 80MB)

-- Índice HNSW — sólo se crea cuando haya datos suficientes (>1000 providers)
-- HNSW: grafo multicapa que permite approximate nearest neighbor en milisegundos
-- Se comenta en la migración inicial y se descomenta cuando sea necesario
-- CREATE INDEX idx_providers_embedding ON providers
--   USING hnsw(embedding vector_cosine_ops)
--   WITH (m = 16, ef_construction = 64);
```

```typescript
// packages/kernel/src/search/embedding.port.ts

// Puerto para generación de embeddings — implementable con modelo local o API
export interface EmbeddingPort {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// Adapter con modelo local (all-MiniLM-L6-v2 via ONNX — sin llamadas a red)
// 80MB, corre en CPU, latencia ~20ms por embedding
export class LocalEmbeddingAdapter implements EmbeddingPort {
  private session: InferenceSession;

  async embed(text: string): Promise<number[]> {
    // Tokenizar + inferencia ONNX → vector de 384 dimensiones
    const output = await this.session.run(tokenize(text));
    return Array.from(output.embeddings.data as Float32Array);
  }
}
```

```sql
-- Cuando se active: búsqueda híbrida (semántica + texto + geo en una sola query)
-- Esto resuelve el "hybrid search problem" sin necesidad de Pinecone ni servicio externo
SELECT
  p.id,
  p.display_name,
  -- Similitud coseno con el embedding de la query del usuario
  1 - (p.embedding <=> $query_embedding::vector) AS semantic_score,
  ts_rank(p.search_vector, to_tsquery('spanish', $text_query))  AS text_score,
  ST_Distance(p.location, ST_MakePoint($lng, $lat)::GEOGRAPHY)  AS distance_meters
FROM providers p
WHERE
  p.vertical_id   = $vertical_id
  AND p.is_active = true
  AND p.embedding IS NOT NULL
  -- Filtro geográfico (relacional) combinado con búsqueda vectorial — en una sola query
  AND ST_DWithin(p.location, ST_MakePoint($lng, $lat)::GEOGRAPHY, $radius_meters)
ORDER BY
  -- Puntuación combinada: 40% semántica + 30% texto + 30% proximidad
  (  (1 - (p.embedding <=> $query_embedding::vector)) * 0.4
   + ts_rank(p.search_vector, to_tsquery('spanish', $text_query)) * 0.3
  ) DESC,
  distance_meters ASC NULLS LAST
LIMIT $limit;
```

> **Cuándo activar**: cuando los usuarios expresen que no encuentran lo que buscan con la búsqueda
> actual. El modelo `all-MiniLM-L6-v2` es MIT, pesa 80MB y corre en CPU sin GPU. Los embeddings
> se generan una vez por provider y se actualizan sólo cuando cambia `bio` o `display_name`.

---

## Migraciones

Drizzle Kit gestiona todas las migraciones. Los ficheros van en `infra/migrations/` con nombre `NNNN_descripcion.sql`. Nunca se edita una migración ya aplicada — se crea una nueva.

```bash
# Generar migración desde el schema de Drizzle
npx drizzle-kit generate

# Aplicar en desarrollo
npx drizzle-kit migrate

# En CI/CD se aplica automáticamente antes del deploy
```
