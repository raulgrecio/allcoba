# CLAUDE.md — services/notification-service

> Envío de notificaciones push, email e in-app.
> Puerto: 3003. Consume jobs de la cola — no recibe requests directos del gateway.

---

## Responsabilidad única

Entregar notificaciones a usuarios por cualquier canal.
No sabe de lógica de negocio — solo recibe tipo + destinatario + datos y entrega.

---

## Lo que hace

- Consumir jobs `send-notification` de la cola
- Push notifications via FCM (Firebase Cloud Messaging — solo mensajería)
- Email (Resend o SMTP propio — fase futura)
- Notificaciones in-app (guardadas en BD, el cliente las lee por polling o SSE)
- Reintentos automáticos con backoff exponencial
- Registro de entrega (enviada, fallida, leída)

## Lo que NO hace

- Recibir requests HTTP directos del gateway para notificaciones
  (todo llega por la cola — si necesitas notificar, publica un job)
- Acceder a datos cifrados de usuarios
- Saber qué significa el tipo de notificación — solo lo entrega

---

## Tipos de notificación (definidos en shared-types)

```typescript
// packages/shared-types/src/notification-types.ts
type NotificationType =
  | 'new_contact_request'
  | 'match_created'
  | 'new_message'
  | 'appointment_confirmed'
  | 'appointment_reminder_24h'
  | 'appointment_reminder_2h'
  | 'appointment_cancelled'
  | 'appointment_no_show'
  | 'review_requested'
  | 'match_layer2_unlocked'
  | 'profile_layer3_shared'
  | 'image_approved'
  | 'image_rejected';
```

---

## Contrato del job

```typescript
// Job publicado por cualquier servicio
interface SendNotificationJob {
  type: NotificationType;
  recipientId: string; // userId del destinatario
  data: Record<string, string>; // sin PII — solo IDs y tipos
  channels: ('push' | 'inapp' | 'email')[]; // canales a usar
  priority?: number; // default 5
}
```

---

## Tablas en schema `notifications`

```sql
notifications.device_tokens   -- user_id, token, platform, created_at
notifications.inbox           -- id, user_id, type, data, read_at, created_at
notifications.delivery_log    -- id, notification_id, channel, status, attempts
```

---

## Variables de entorno requeridas

```env
PORT=3003
DATABASE_URL=
FCM_SERVER_KEY=              # Firebase Cloud Messaging (solo push)
LOG_LEVEL=info
SERVICE_NAME=notification-service
```
