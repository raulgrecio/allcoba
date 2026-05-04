# 15 · Flujo de contacto anónimo

> El consumer inicia contacto sin revelar su identidad.
> El provider responde sin saber quién es el consumer hasta que este decide revelarse.

---

## Estados de una conversación

```
initiated → provider_notified → active → completed
                                       → expired (7 días sin respuesta)
                                       → cancelled (cualquiera cancela)

Tras completed:
  → rated (consumer deja review)
  → rated_both (ambos se califican mutuamente)
```

---

## Flujo completo

```
[Consumer]                          [Sistema]                    [Provider]

1. Busca providers por vertical
2. Ve ficha pública del provider
3. Pulsa "Contactar"
   POST /api/v1/contact
   { providerId, message, vertical }
                                    4. Crea conversación
                                       status: 'initiated'
                                       consumer permanece anónimo
                                    5. Notifica al provider
                                       (push + in-app)
                                       SIN datos del consumer
                                                                 6. Recibe notificación:
                                                                    "Nuevo interesado en
                                                                    [vertical]"
                                                                 7. Ve el mensaje inicial
                                                                    (consumer anónimo)
                                                                 8. Responde
                                    9. status → 'active'
                                    10. Notifica al consumer
10. Recibe respuesta
    Ve que el provider respondió
11. Puede continuar conversando
    O revelar su identidad:
    POST /api/v1/conversations/:id/reveal-identity
    { name, phone }
                                    12. Cifra name + phone con
                                        DEK del provider
                                    13. Guarda en customer record
                                        del provider
                                                                 14. Ve nombre y teléfono
                                                                     del consumer
```

---

## Entidad Conversation (dominio)

```typescript
interface Conversation {
  id: string;
  providerId: string;
  consumerHash: string; // identidad opaca del consumer
  vertical: string;
  status: ConversationStatus;
  messages: ConversationMessage[];
  isIdentityRevealed: boolean; // el consumer ha revelado su identidad
  initiatedAt: Date;
  lastActivityAt: Date;
  expiresAt: Date; // 7 días desde initiated si no hay respuesta
}

interface ConversationMessage {
  id: string;
  role: 'consumer' | 'provider';
  content: string; // en claro en la entidad de dominio
  sentAt: Date;
}

// En persistencia, messages se guarda cifrado con DEK del provider
// Un provider puede leer todas sus conversaciones
// Un consumer puede leer sólo el estado y sus propios mensajes
```

---

## Reglas de negocio

```typescript
// packages/domain/src/conversation/conversation.rules.ts

// Un consumer no puede iniciar más de 3 conversaciones activas
// con el mismo provider en 30 días
const MAX_ACTIVE_CONVERSATIONS_PER_PROVIDER = 3;
const WINDOW_DAYS = 30;

// Una conversación expira si el provider no responde en 7 días
const EXPIRY_DAYS = 7;

// El provider puede marcar un consumer como "no deseable"
// (el consumer no recibe notificación — simplemente sus mensajes no llegan)
// Esta decisión sólo afecta a ese provider concreto, no a toda la plataforma

// La identidad sólo se puede revelar una vez — es irreversible
// El consumer no puede "des-revelar" su identidad con un provider
```

---

## Notificaciones

Las notificaciones son el único momento en que el sistema contacta activamente con los usuarios. Se envían via FCM (push) y como in-app notification. El email es opcional y configurable.

```typescript
interface NotificationPayload {
  type: NotificationType;
  recipientId: string;
  data: Record<string, string>; // sin PII en el payload de push
}

type NotificationType =
  | 'new_contact_request' // al provider: nuevo interesado
  | 'provider_replied' // al consumer: el provider respondió
  | 'new_message' // a cualquiera: nuevo mensaje en conversación activa
  | 'conversation_expiring' // a ambos: la conversación expira en 24h
  | 'review_requested' // al consumer: ¿quieres dejar una reseña?
  | 'identity_revealed'; // al provider: el consumer ha compartido sus datos
```
