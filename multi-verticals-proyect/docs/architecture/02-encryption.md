# 02 · Cifrado

> Stack: **pgcrypto** (PostgreSQL) + **Node.js crypto** (Web Crypto API nativa)
> Sin librerías externas de cifrado. Sin KMS de pago. Cero dependencias adicionales.

---

## Modelo de amenaza que este sistema resuelve

- Alguien extrae un backup de la base de datos → los datos PII son ilegibles
- Alguien accede al disco del servidor → mismo resultado
- La plataforma (nosotros) no puede leer los datos personales de los clientes de ningún provider
- Si un provider abandona la plataforma, sus datos son completamente suyos

Lo que este sistema **no resuelve**: un atacante que roba la sesión activa de un provider legítimo. Eso lo resuelve `03-auth-security.md`.

---

## Patrón: Envelope Encryption con dos capas de clave

```
Password del provider
       │
       ▼ PBKDF2 (100.000 iteraciones, SHA-256)
  Derived Key
       │
       ▼ AES-256-GCM (descifra)
      KEK  ← almacenada cifrada en key_management DB
       │
       ▼ AES-256-GCM (descifra)
      DEK  ← almacenada cifrada en key_management DB
       │
       ▼ AES-256-GCM (cifra/descifra)
  Datos PII del cliente
```

La **DEK** (Data Encryption Key) es única por provider y cifra todos los datos PII de sus clientes.
La **KEK** (Key Encryption Key) se deriva del password del provider y sólo existe para proteger la DEK.
La plataforma nunca tiene acceso a ninguna de las dos en texto plano.

---

## Base de datos de claves (separada)

La Key Management DB es una base de datos PostgreSQL **separada** del resto de la aplicación. El app server no tiene acceso directo a ella — existe un microservicio interno `key-service` que es el único que lee y escribe esta DB.

```sql
-- En la Key Management DB (base de datos separada)
CREATE TABLE provider_keys (
  provider_id     UUID PRIMARY KEY,
  kek_enc         BYTEA NOT NULL,  -- KEK cifrada con derived key del password
  dek_enc         BYTEA NOT NULL,  -- DEK cifrada con KEK
  kdf_salt        BYTEA NOT NULL,  -- sal para PBKDF2 (generada aleatoriamente)
  kdf_iterations  INTEGER DEFAULT 100000,
  created_at      TIMESTAMPTZ DEFAULT now(),
  rotated_at      TIMESTAMPTZ
);
```

---

## Flujo de alta de un provider

```typescript
// apps/api/src/modules/auth/use-cases/RegisterProvider.ts

async function registerProvider(dto: RegisterProviderDTO): Promise<void> {
  // 1. Generar sal aleatoria para PBKDF2
  const salt = crypto.getRandomValues(new Uint8Array(32))

  // 2. Derivar clave del password con PBKDF2
  const derivedKey = await deriveKeyFromPassword(dto.password, salt)

  // 3. Generar KEK aleatoria
  const kek = crypto.getRandomValues(new Uint8Array(32))

  // 4. Generar DEK aleatoria
  const dek = crypto.getRandomValues(new Uint8Array(32))

  // 5. Cifrar DEK con KEK
  const dekEnc = await encryptAESGCM(dek, kek)

  // 6. Cifrar KEK con derived key
  const kekEnc = await encryptAESGCM(kek, derivedKey)

  // 7. Guardar KEK cifrada y DEK cifrada en Key Management DB
  await keyService.storeKeys({
    providerId: newProvider.id,
    kekEnc,
    dekEnc,
    kdfSalt: salt,
  })

  // 8. El password se guarda hasheado (Argon2id) en la DB principal
  //    NUNCA en claro, NUNCA la derived key
  await providerRepo.create({
    ...dto,
    passwordHash: await argon2.hash(dto.password),
  })
}
```

---

## Flujo de login y acceso a datos

```typescript
// apps/api/src/modules/auth/use-cases/LoginProvider.ts

async function loginProvider(email: string, password: string): Promise<Session> {
  const provider = await providerRepo.findByEmail(email)
  if (!provider) throw new InvalidCredentialsError()

  // 1. Verificar password con Argon2id
  const valid = await argon2.verify(provider.passwordHash, password)
  if (!valid) throw new InvalidCredentialsError()

  // 2. Obtener KEK cifrada y sal desde Key Management DB
  const { kekEnc, kdfSalt } = await keyService.getProviderKeys(provider.id)

  // 3. Re-derivar clave del password (misma sal)
  const derivedKey = await deriveKeyFromPassword(password, kdfSalt)

  // 4. Descifrar KEK en memoria
  const kek = await decryptAESGCM(kekEnc, derivedKey)

  // 5. Descifrar DEK en memoria con KEK
  const { dekEnc } = await keyService.getProviderKeys(provider.id)
  const dek = await decryptAESGCM(dekEnc, kek)

  // 6. DEK se guarda SÓLO en memoria de sesión (no en DB, no en cookie)
  //    Se usa un store en memoria del proceso con TTL = duración del JWT
  const sessionId = crypto.randomUUID()
  sessionStore.set(sessionId, { providerId: provider.id, dek }, { ttl: 900 }) // 15 min

  // 7. Emitir JWT que referencia el sessionId (no contiene la DEK)
  return issueJWT({ providerId: provider.id, sessionId })
}
```

---

## Cifrado de datos PII en PostgreSQL

El cifrado se hace en la capa de la aplicación antes de insertar, usando `pgcrypto` como función de cifrado dentro de la query. La DEK nunca se almacena permanentemente en el proceso — se recupera del sessionStore para cada operación.

```typescript
// packages/kernel/src/crypto/encrypt-columns.ts

export async function encryptField(value: string, dek: Uint8Array): Promise<Buffer> {
  // AES-256-GCM: genera IV aleatorio de 12 bytes por cada valor
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await crypto.subtle.importKey('raw', dek, 'AES-GCM', false, ['encrypt'])
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, Buffer.from(value))
  // Formato: [IV (12 bytes)][ciphertext]
  return Buffer.concat([iv, Buffer.from(encrypted)])
}

export async function decryptField(encrypted: Buffer, dek: Uint8Array): Promise<string> {
  const iv = encrypted.subarray(0, 12)
  const ciphertext = encrypted.subarray(12)
  const key = await crypto.subtle.importKey('raw', dek, 'AES-GCM', false, ['decrypt'])
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return Buffer.from(decrypted).toString('utf8')
}
```

```typescript
// Uso en el adapter de Drizzle
async function saveCustomer(customer: Customer, dek: Uint8Array): Promise<void> {
  await db.insert(customersTable).values({
    id: customer.id,
    consumerHash: customer.consumerHash,
    nameEnc: await encryptField(customer.name, dek),
    phoneEnc: await encryptField(customer.phone, dek),
    emailEnc: customer.email ? await encryptField(customer.email, dek) : null,
    tags: customer.tags,  // etiquetas IA — sin PII, en claro
  })
}
```

---

## Función de derivación de clave

```typescript
// packages/kernel/src/crypto/kdf.ts

export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    Buffer.from(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: 100_000,  // mínimo recomendado OWASP 2024
    },
    keyMaterial,
    256
  )
  return new Uint8Array(bits)
}
```

---

## Rotación de claves

Cuando un provider cambia su password, la KEK debe re-cifrarse. La DEK **no cambia** — sólo cambia el cifrado que la protege. Esto evita tener que re-cifrar todos los datos de los clientes.

```typescript
async function rotateProviderKey(
  providerId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> {
  // 1. Verificar password antiguo y obtener DEK actual
  const dek = await getDEKFromSession(providerId, oldPassword)

  // 2. Generar nueva sal
  const newSalt = crypto.getRandomValues(new Uint8Array(32))

  // 3. Derivar nueva clave del nuevo password
  const newDerivedKey = await deriveKeyFromPassword(newPassword, newSalt)

  // 4. Generar nueva KEK
  const newKEK = crypto.getRandomValues(new Uint8Array(32))

  // 5. Cifrar DEK existente con nueva KEK (los datos no cambian)
  const newDEKEnc = await encryptAESGCM(dek, newKEK)

  // 6. Cifrar nueva KEK con nueva derived key
  const newKEKEnc = await encryptAESGCM(newKEK, newDerivedKey)

  // 7. Actualizar en Key Management DB
  await keyService.rotateKeys({ providerId, kekEnc: newKEKEnc, dekEnc: newDEKEnc, kdfSalt: newSalt })
}
```

---

## Qué nunca debe aparecer en logs

El wrapper de Pino tiene una lista de campos redactados automáticamente:

```typescript
// packages/kernel/src/logger/index.ts
export const logger = pino({
  redact: {
    paths: ['dek', 'kek', 'password', 'passwordHash', 'token', 'secret',
            'authorization', 'derivedKey', 'kekEnc', 'dekEnc', '*.dek', '*.kek'],
    censor: '[REDACTED]'
  }
})
```

Si ves `[REDACTED]` en un log, es correcto. Si ves un Buffer o Uint8Array en un log de producción dentro de estos campos, es un bug crítico de seguridad.
