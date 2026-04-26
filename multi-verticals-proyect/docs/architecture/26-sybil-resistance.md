# 26 · Resistencia Sybil — Defensa contra identidades múltiples

> Estrategia MVP: recolectar huella de dispositivo silenciosamente.
> Sin lógica de actuación. Sin moderación. Sin coste de implementación extra.
> Los datos se acumulan. Se usan cuando haya masa crítica y sea necesario actuar.

---

## Estrategia

```
MVP (ahora):
  ✓ Capa 1 — Fricción en registro    → 24h sin poder contactar · límite semanal
  ✓ Capa 2 — Fingerprinting          → recolección silenciosa · sin actuar aún

Fase avanzada (cuando haya tracción):
  · Capa 3 — Detección de patrones de comportamiento
  · Capa 4 — Red de confianza social (avales entre usuarios)
  · Moderación humana activada con los datos ya recopilados
```

---

## Capa 1 — Fricción mínima en cuentas nuevas

Coste cero de implementación. El usuario legítimo no lo nota.

```typescript
// packages/kernel/src/trust/account-age-limits.ts

function getAccountPrivileges(accountAgeDays: number): AccountPrivileges {
  if (accountAgeDays < 1) {
    return { canContact: false, maxContactsPerDay: 0 }
    // Primeras 24h: sólo puede navegar el deck — no contactar
  }
  if (accountAgeDays < 7) {
    return { canContact: true, maxContactsPerDay: 3, maxContactsPerWeek: 10 }
    // Primera semana: muy limitado
  }
  if (accountAgeDays < 30) {
    return { canContact: true, maxContactsPerDay: 10, maxContactsPerWeek: 40 }
  }
  // Cuenta consolidada — sin límites especiales
  return { canContact: true, maxContactsPerDay: 50, maxContactsPerWeek: 200 }
}

// Score inicial de toda cuenta nueva: 2.5 / 5 (neutro)
// El Presenter puede filtrar "sólo cuentas con historial" usando este campo
const STARTING_TRUST_SCORE = 2.5
```

---

## Capa 2 — Fingerprinting del dispositivo (sólo recolección)

El cliente calcula el hash del fingerprint localmente y lo envía al registro.
El servidor lo guarda. No hace nada más con él de momento.

```typescript
// apps/mobile/lib/core/security/device_fingerprint.dart

import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:device_info_plus/device_info_plus.dart';

class DeviceFingerprint {
  static Future<String> compute() async {
    final info = DeviceInfoPlugin();
    final data = <String>[];

    if (Platform.isIOS) {
      final ios = await info.iosInfo;
      data.addAll([
        ios.model,           // "iPhone15,2"
        ios.systemVersion,   // "17.4"
        ios.utsname.machine, // identificador de hardware
      ]);
    } else {
      final android = await info.androidInfo;
      data.addAll([
        android.model,
        android.version.release,
        android.board,
        android.hardware,
      ]);
    }

    // Añadir el installationId — persiste en Keychain (iOS) o
    // EncryptedSharedPreferences (Android) aunque se borre la app
    final installationId = await _getOrCreateInstallationId();
    data.add(installationId);

    // Hash SHA-256 — no reversible · nunca enviamos el fingerprint en claro
    final combined = data.join('|');
    final bytes    = utf8.encode(combined);
    return sha256.convert(bytes).toString();
  }

  static Future<String> _getOrCreateInstallationId() async {
    // Lee de almacenamiento seguro o genera uno nuevo
    const key = 'installation_id';
    final stored = await secureStorage.read(key: key);
    if (stored != null) return stored;
    final newId = const Uuid().v4();
    await secureStorage.write(key: key, value: newId);
    return newId;
  }
}
```

```typescript
// En el registro — el fingerprintHash se envía junto con el teléfono
// apps/api/src/modules/auth/use-cases/RegisterUser.ts

export class RegisterUserUseCase {
  async execute(dto: RegisterUserDTO): Promise<void> {
    // Crear usuario normalmente
    const user = await userRepo.create(dto)

    // Guardar fingerprint — sólo almacenar, sin lógica adicional
    if (dto.fingerprintHash) {
      await db.insert(deviceFingerprints).values({
        userId:          user.id,
        fingerprintHash: dto.fingerprintHash,
      })
    }
  }
}
```

```sql
-- Tabla donde se acumulan los datos
-- Sin índices complejos de momento — sólo guardar
CREATE TABLE device_fingerprints (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id),
  fingerprint_hash TEXT NOT NULL,
  registered_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_fingerprint_hash ON device_fingerprints(fingerprint_hash);
```

---

## Qué tendremos cuando sea el momento de actuar

Con estos datos acumulados podremos:

- Cruzar el fingerprint de una cuenta baneada con cuentas nuevas registradas
  desde el mismo dispositivo
- Ver cuántas cuentas distintas ha creado un mismo dispositivo a lo largo del tiempo
- Identificar dispositivos que sistemáticamente crean cuentas con mal comportamiento
- Decidir con datos reales si el problema justifica moderación humana,
  bloqueo automático o una capa de verificación adicional

Todo esto sin haber pedido nada al usuario y sin haber gastado nada en moderación.

---

## Lo que NO se implementa en el MVP

```
✗ Moderación humana activa
✗ Bloqueo automático de dispositivos
✗ Cola de revisión de cuentas sospechosas
✗ Detección de patrones de comportamiento
✗ Red de confianza / avales
✗ Panel de moderación

Todo esto se construye encima de los datos ya recopilados
cuando el volumen de usuarios lo justifique.
```
