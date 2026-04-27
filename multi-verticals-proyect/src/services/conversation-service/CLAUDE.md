# CLAUDE.md — services/conversation-service

> Chat, mensajes y gestión del flujo de contacto anónimo.
> Puerto: 3006.

---

## Responsabilidad única

Gestionar el ciclo de vida completo de una conversación entre Presenter y Chooser.

---

## Lo que hace

- Crear conversaciones (primer contacto del Chooser)
- Enrutar mensajes entrantes a través de la plantilla de filtrado del Presenter
  (accept → bandeja / archive → archivados / reject → rechazado silencioso)
- Gestionar el hilo de mensajes
- Aplicar los niveles de visibilidad del Presenter (silenciado → archivado)
- Gestionar la expiración de conversaciones (7 días sin respuesta)
- Cifrar contenido de conversaciones con DEK del Presenter
  (necesita solicitar DEK al gateway via endpoint interno)
- Publicar job `analyze-conversation` para etiquetado IA tras conversación

## Lo que NO hace

- Matches (matching-service)
- Notificaciones (publica jobs)
- Moderación de imágenes en chat (media-service)

---

## Tablas en schema `conversations`

```sql
conversations.conversations     -- id, vertical, presenter_id, chooser_hash, status
conversations.messages          -- id, conversation_id, role, content_enc, sent_at
conversations.filter_templates  -- user_id, vertical, default_action, rules JSONB
conversations.profile_layer_grants -- grantor_id, grantee_id, vertical, layer, key_enc
```

---

## Variables de entorno requeridas

```env
PORT=3006
DATABASE_URL=
GATEWAY_INTERNAL_URL=http://api-gateway:3000
MATCHING_SERVICE_URL=http://matching-service:3005
LOG_LEVEL=info
SERVICE_NAME=conversation-service
CONVERSATION_EXPIRY_DAYS=7
```
