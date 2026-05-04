# CLAUDE.md — services/auth-service

> Gestión de identidad, credenciales y claves de cifrado.
> Puerto: 3001. Solo accesible desde api-gateway.

---

## Responsabilidad única

Todo lo relacionado con quién es el usuario y cómo se protegen sus claves.
No conoce verticales, Presenters, Choosers ni lógica de negocio.

---

## Lo que hace

- Registro: teléfono → OTP → crear cuenta + generar KEK/DEK
- Login: teléfono + contraseña + MFA TOTP → JWT + sessionId
- Refresh: renovar access token con refresh token
- Logout: revocar refresh token + notificar al gateway para limpiar sessionStore
- MFA: setup (genera secret + QR) y verificación (valida código TOTP)
- KEK/DEK: generación, almacenamiento cifrado en KM DB, rotación en cambio de password
- Fingerprinting: guardar hash del dispositivo en registro (sin actuar en MVP)

## Lo que NO hace

- Verificar tokens de otros servicios (ellos lo hacen localmente con JWT_PUBLIC_KEY)
- Guardar la DEK en su propia memoria (la DEK va al sessionStore del GATEWAY)
- Enviar notificaciones (publica job `send-notification` en la cola)
- Acceder a datos de negocio

---

## Flujo de login completo

```
POST /auth/login { phone, password, totpCode? }
  1. Verificar password con Argon2id
  2. Verificar código TOTP si MFA activo
  3. Obtener kekEnc + dekEnc + kdfSalt de Key Management DB
  4. Derivar clave del password con PBKDF2 (100K iter)
  5. Descifrar KEK con derived key
  6. Descifrar DEK con KEK
  7. Generar sessionId aleatorio
  8. Llamar al gateway: PUT /internal/sessions/:sessionId { dek }
     (el gateway guarda la DEK en su sessionStore)
  9. Limpiar DEK de memoria de este servicio
  10. Emitir JWT RS256 con { sub, role, sessionId }
  11. Emitir refresh token (opaque) en cookie httpOnly
  12. Responder con access token
```

---

## Tablas en schema `auth`

```sql
auth.users               -- id, phone_hash, password_hash, role, status
auth.refresh_tokens      -- id, user_id, token_hash, expires_at, revoked_at
auth.mfa_secrets         -- user_id, secret_enc, is_active
auth.device_fingerprints -- id, user_id, fingerprint_hash, registered_at
auth.otp_codes           -- id, phone_hash, code_hash, expires_at, used_at
```

Key Management DB (instancia PostgreSQL separada):

```sql
provider_keys  -- provider_id, kek_enc, dek_enc, kdf_salt, kdf_iterations
```

---

## Seguridad crítica

```
JWT_PRIVATE_KEY  → SOLO en este servicio. Nunca compartida.
JWT_PUBLIC_KEY   → Distribuida a todos los servicios via env.
DEK              → Vive en sessionStore del GATEWAY, no aquí.
                   Después del login, la DEK se borra de la memoria de auth-service.
Argon2id         → memoryCost: 65536 (64MB), timeCost: 3, parallelism: 4
PBKDF2           → 100.000 iteraciones, SHA-256, sal de 32 bytes aleatorios
AES-256-GCM      → IV aleatorio de 12 bytes por cada cifrado
```

---

## Variables de entorno requeridas

```env
PORT=3001
NODE_ENV=production
DATABASE_URL=             # schema auth en PostgreSQL compartida
KEY_MGMT_DATABASE_URL=    # instancia PostgreSQL separada para KEK/DEK
JWT_PRIVATE_KEY=          # RS256 PEM — SOLO en este servicio
JWT_PUBLIC_KEY=           # RS256 PEM
GATEWAY_INTERNAL_URL=http://api-gateway:3000  # para guardar DEK en sessionStore
PLATFORM_SALT=            # para consumer_hash — NUNCA cambiar en producción
LOG_LEVEL=info
SERVICE_NAME=auth-service
```
