# CLAUDE.md — services/matching-service

> Deck de swipe, preferencias del Chooser y gestión de matches.
> Puerto: 3005.

---

## Responsabilidad única

Decidir qué Presenters ve el Chooser y gestionar el ciclo de vida del match.

---

## Lo que hace

- Generar el deck personalizado para cada Chooser
  (candidatos filtrados por preferencias aprendidas + visibilidad)
- Registrar señales de swipe (like / pass / super_like)
- Actualizar preferencias del Chooser de forma asíncrona
- Crear matches cuando el Presenter acepta un contacto
- Gestionar niveles de visibilidad (silenciado / bloqueado / preferido)
- Verificar si un Chooser puede contactar a un Presenter

## Lo que NO hace

- Búsqueda geoespacial (delega en search-service)
- Chat o mensajes (conversation-service)
- Notificaciones (publica jobs)

---

## Tablas en schema `matching`

```sql
matching.swipe_signals          -- consumer_id, provider_id, signal, created_at
matching.consumer_preferences   -- consumer_id, vertical, attribute_weights, seen_ids
matching.matches                -- id, vertical, presenter_id, chooser_id, status
matching.provider_consumer_relations  -- silenciado / bloqueado / preferido
matching.platform_bans          -- bans de plataforma
```

---

## Variables de entorno requeridas

```env
PORT=3005
DATABASE_URL=
SEARCH_SERVICE_URL=http://search-service:3004
LOG_LEVEL=info
SERVICE_NAME=matching-service
```
