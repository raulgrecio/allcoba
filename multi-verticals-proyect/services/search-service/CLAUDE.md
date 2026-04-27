# CLAUDE.md — services/search-service

> Búsqueda geoespacial, full-text y semántica de Presenters.
> Puerto: 3004. Alto volumen de lecturas — ratio lectura/escritura ~1000:1.

---

## Responsabilidad única

Encontrar Presenters relevantes para un Chooser dado su contexto.
Solo lecturas de BD — nunca escribe datos de negocio.

---

## Lo que hace

- Búsqueda combinada: geo (PostGIS) + texto (tsvector) + vectorial (pgvector)
- Filtros por atributos de la vertical (dinámicos por vertical config)
- Paginación cursor-based (keyset pagination — no OFFSET)
- Actualización del índice de búsqueda cuando un Presenter actualiza perfil
  (consume job `reindex-provider` de la cola)
- Búsqueda semántica con pgvector cuando embeddings estén disponibles

## Lo que NO hace

- Escribir datos de negocio
- Acceder a datos cifrados
- Gestionar el deck de swipe (eso es matching-service)

---

## Adapter de búsqueda (migrable)

```typescript
// Hoy: PostgresSearchAdapter (tsvector + PostGIS + pgvector)
// Futuro: TypesenseSearchAdapter (cuando el volumen lo justifique)
// El servicio no sabe cuál usa — siempre a través de SearchPort
```

---

## Tablas que LEE (schema shared)

```sql
shared.providers_public    -- datos públicos de Presenters (Capa 1)
shared.verticals           -- configuración de verticales
```

---

## Variables de entorno requeridas

```env
PORT=3004
DATABASE_URL=
LOG_LEVEL=info
SERVICE_NAME=search-service
SEARCH_ADAPTER=postgres    # postgres | typesense (futuro)
```
