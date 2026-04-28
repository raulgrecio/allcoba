# Skill: Seguridad

Reglas de seguridad que se aplican en TODOS los servicios de Allcoba.
Leer antes de escribir cualquier código que toque autenticación, cifrado o datos de usuarios.

---

## Reglas absolutas — nunca violar

```
1. userId SIEMPRE del JWT verificado — nunca de body, params, query string o headers del cliente
2. DEK nunca en logs, nunca en respuestas HTTP, nunca en disco
3. Headers internos X-* sobreescritos SIEMPRE por el gateway
4. JWT verificado localmente con clave pública — nunca llamar al auth-service por request normal
5. Secrets en variables de entorno — nunca en código fuente
6. Sin DNI ni documentos de identidad — nunca pedirlos, nunca almacenarlos
```

---

## Pino redact — campos que SIEMPRE se redactan

El wrapper de Pino en `@allcoba/kernel` ya tiene estos campos redactados.
Si añades un campo nuevo que contenga datos sensibles, añadirlo al wrapper:

```typescript
// packages/kernel/src/logger/index.ts
const REDACTED_PATHS = [
  'dek', 'kek', 'password', 'passwordHash',
  'token', 'secret', 'authorization', 'derivedKey',
  'kekEnc', 'dekEnc', 'otpCode', 'totpSecret',
  '*.dek', '*.kek', '*.password',
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-session-id"]',  // sessionId tampoco en logs
]
```

---

## Tenant isolation — tres barreras

Nunca depender de una sola barrera:

```typescript
// BARRERA 1: middleware del gateway (sobreescribe headers siempre)
request.headers['x-user-id'] = payload.sub  // del JWT, nunca del cliente

// BARRERA 2: lógica del servicio (usar siempre el header, nunca params/body)
const userId = request.headers['x-user-id'] as string  // del gateway
// Nunca: request.params.userId, request.body.userId, request.query.userId

// BARRERA 3: PostgreSQL Row-Level Security
await db.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`)
```

---

## DEK — gestión en memoria

```typescript
// ✅ CORRECTO — DEK solo en memoria, nunca serializada
sessionStore.set(sessionId, dek, { ttlMs: 15 * 60 * 1000 })

// ✅ CORRECTO — limpiar referencia tras uso
async function decrypt(enc: Buffer, dek: Uint8Array): Promise<string> {
  const result = await decryptField(enc, dek)
  // dek se GC cuando sale del scope
  return result
}

// ❌ INCORRECTO — DEK en log
logger.info({ userId, dek }, 'processing customer')

// ❌ INCORRECTO — DEK en respuesta HTTP
reply.send({ customers, dek: dek.toString('hex') })

// ❌ INCORRECTO — DEK en disco
fs.writeFileSync('/tmp/session.json', JSON.stringify({ dek }))
```

---

## Argon2id — configuración obligatoria

```typescript
import argon2 from 'argon2'

const ARGON2_CONFIG = {
  type:        argon2.argon2id,
  memoryCost:  65536,  // 64MB — nunca menos
  timeCost:    3,
  parallelism: 4,
}

// Nunca usar argon2i o argon2d — solo argon2id
// Nunca bajar memoryCost para "hacer los tests más rápidos"
// En tests: mockear la función hash, no bajar los parámetros
```

---

## PBKDF2 — derivación de clave del password

```typescript
// 100.000 iteraciones mínimo — nunca menos
const bits = await crypto.subtle.deriveBits({
  name:       'PBKDF2',
  hash:       'SHA-256',
  salt,
  iterations: 100_000,  // nunca negociable
}, keyMaterial, 256)
```

---

## AES-256-GCM — IV aleatorio por operación

```typescript
// ✅ CORRECTO — IV nuevo para cada cifrado
const iv = crypto.getRandomValues(new Uint8Array(12))
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv, tagLength: 128 },
  key,
  plaintext
)
// Formato: [IV 12 bytes][ciphertext + auth tag]
return Buffer.concat([iv, Buffer.from(encrypted)])

// ❌ INCORRECTO — IV fijo (rompe la seguridad de AES-GCM)
const iv = Buffer.alloc(12, 0)
```

---

## Fingerprinting de dispositivo — solo recolectar

En el MVP solo se guarda el hash. No bloquear, no actuar automáticamente:

```typescript
// ✅ CORRECTO — guardar y olvidar (por ahora)
await db.insert(deviceFingerprints).values({
  userId:          user.id,
  fingerprintHash: dto.fingerprintHash,
})

// ❌ INCORRECTO — bloquear automáticamente (no en MVP)
if (await isBannedDevice(dto.fingerprintHash)) {
  throw new DeviceBannedError()
}
```

---

## Inputs al modelo de IA — sanitizar siempre

```typescript
// Antes de pasar CUALQUIER texto del usuario al modelo de IA
function sanitizeForModel(text: string): string {
  return text
    .replace(/<\|system\|>/gi, '')
    .replace(/<\|user\|>/gi, '')
    .replace(/<\|assistant\|>/gi, '')
    .replace(/ignore (all )?previous instructions?/gi, '')
    .trim()
    .slice(0, 2000)  // límite duro — nunca negociable
}
```
