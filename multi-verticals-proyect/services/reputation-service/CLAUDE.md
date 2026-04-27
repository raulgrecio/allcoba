# CLAUDE.md — services/reputation-service

> Trust scores, reviews y sistema de reputación.
> Puerto: 3008.

---

## Responsabilidad única

Calcular, almacenar y servir señales de confianza entre usuarios.
Siempre anónimo: nunca revela quién calificó a quién.

---

## Lo que hace

- Recibir y validar reviews (solo tras interacción verificada, cooldown 24h)
- Calcular scores agregados por dimensión y por vertical
- Contribuciones anónimas al trust score del Chooser con ruido diferencial
- Detección de spike de reviews → alerta (fase futura: moderación)
- Servir scores públicos a otros servicios

## Reglas de privacidad

- El trust score del Chooser solo sube/baja por calificaciones EXPLÍCITAS
- El comportamiento implícito (archivos, rechazos) NO afecta al score público
- Las contribuciones usan ruido diferencial (ε=0.1) — no reversibles
- consumer_hash = SHA-256(consumerId + PLATFORM_SALT) — no reversible

---

## Tablas en schema `reputation`

```sql
reputation.provider_reviews          -- reviews públicas de Presenters
reputation.trust_signal_contributions -- contribuciones anónimas al score del Chooser
reputation.trust_scores              -- scores agregados por consumer_hash
reputation.provider_scores           -- scores agregados por provider
```

---

## Variables de entorno requeridas

```env
PORT=3008
DATABASE_URL=
PLATFORM_SALT=              # para consumer_hash — compartido con auth-service
LOG_LEVEL=info
SERVICE_NAME=reputation-service
```
