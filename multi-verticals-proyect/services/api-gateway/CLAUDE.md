# CLAUDE.md — services/api-gateway

> Único punto de entrada HTTP público de Allcoba.
> Puerto: 3000. Todos los demás servicios son privados.

---

## Responsabilidad única

Enrutar, autenticar y propagar contexto. No contiene lógica de negocio.

```
Recibe request externo
  → verifica JWT localmente (clave pública RS256)
  → recupera DEK del sessionStore si existe
  → inyecta headers internos X-*
  → aplica rate limiting
  → reenvía al servicio interno correcto
  → devuelve la respuesta al cliente
```

---

## Lo que hace

- Verificación local de JWT — sin llamar al auth-service en cada request
- SessionStore para DEKs (Map con TTL en MVP, migrable a Redis)
- Rate limiting por IP y por userId (store en PostgreSQL)
- Inyección de headers internos X-User-Id, X-User-Role, X-Session-Id, X-Vertical, X-Request-Id
- Enrutamiento a servicios internos por path prefix
- Helmet + CORS estricto (solo orígenes configurados)
- Logging estructurado con requestId en cada request

## Lo que NO hace

- Lógica de negocio de ningún tipo
- Acceso directo a PostgreSQL (solo sessionStore en memoria)
- Cifrado o descifrado de datos de usuarios
- Validación de schemas de request (eso lo hace cada servicio destino)

---

## Tabla de rutas

| Path prefix        | Servicio destino          | Auth requerida          |
| ------------------ | ------------------------- | ----------------------- |
| `/auth/*`          | auth-service:3001         | No — son login/registro |
| `/search/*`        | search-service:3004       | Opcional                |
| `/discovery/*`     | matching-service:3005     | Sí                      |
| `/conversations/*` | conversation-service:3006 | Sí                      |
| `/appointments/*`  | appointment-service:3007  | Sí                      |
| `/media/*`         | media-service:3002        | Sí                      |
| `/reputation/*`    | reputation-service:3008   | Sí                      |

---

## Regla crítica de seguridad

Los headers `X-*` internos se sobreescriben SIEMPRE antes de reenviar.
Aunque el cliente malicioso envíe `X-User-Id: otro-uuid`, el gateway lo ignora
y lo reemplaza con el userId del JWT verificado.

```typescript
// SIEMPRE — incluso si el cliente envió el header
request.headers['x-user-id'] = payload.sub; // del JWT verificado
```

---

## Variables de entorno requeridas

```env
PORT=3000
NODE_ENV=production
JWT_PUBLIC_KEY=           # RS256 — solo clave pública
PLATFORM_SALT=            # para consumer_hash
SESSION_SECRET=           # para cookies
CORS_ORIGINS=             # separadas por coma

# URLs servicios internos (Docker Compose / K8s)
AUTH_SERVICE_URL=http://auth-service:3001
SEARCH_SERVICE_URL=http://search-service:3004
MATCHING_SERVICE_URL=http://matching-service:3005
CONVERSATION_SERVICE_URL=http://conversation-service:3006
APPOINTMENT_SERVICE_URL=http://appointment-service:3007
MEDIA_SERVICE_URL=http://media-service:3002
NOTIFICATION_SERVICE_URL=http://notification-service:3003
REPUTATION_SERVICE_URL=http://reputation-service:3008

DATABASE_URL=             # solo para rate limiting store
LOG_LEVEL=info
```
