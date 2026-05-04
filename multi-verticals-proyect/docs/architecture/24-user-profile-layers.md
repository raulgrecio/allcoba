# 24 · Perfil de usuario por capas de privacidad

> El perfil no se revela de golpe. Se desbloquea por capas según la confianza establecida.
> Aplica a todas las verticales — en dating es donde más capas hay.
> El cifrado de cada capa usa la misma arquitectura DEK del sistema (ver 02-encryption.md).

---

## Principio

Un usuario no debería tener que elegir entre privacidad y encontrar lo que busca.
El perfil por capas resuelve esto: muestras lo mínimo necesario para despertar interés,
y vas revelando más sólo cuando hay reciprocidad real.

En culturas donde buscar pareja está estigmatizado, la Capa 1 puede ser
indistinguible de un perfil de servicio profesional. Eso es intencional.

---

## Anonimato del Chooser — decisión de diseño

El Chooser puede ser **permanentemente anónimo** en todas las verticales.
Su identidad dentro de la plataforma es exclusivamente su **reputación acumulada** —
no su nombre, no su foto, no sus datos personales.

Esto es intencional y diferenciador:

- Una persona pública (famosa, política, empresaria) puede usar la app sin riesgo de exposición
- En mercados donde buscar pareja está estigmatizado, el Chooser no deja rastro visible
- La reputación sustituye a la identidad: un Chooser con score 4.8 y 50 interacciones
  verificadas es más confiable que uno con nombre real y score 2.1

```
ESTADOS DE IDENTIDAD DEL CHOOSER
══════════════════════════════════

ESTADO 1 — Anónimo total (defecto para todos los Choosers)
  Sin foto · Sin nombre · Sin datos personales visibles
  Identidad pública = consumer_hash + score de reputación
  El Presenter sólo ve: score, nº interacciones, badge de verificación
  Lo sabe el Chooser: su anonimato es garantizado por diseño

ESTADO 2 — Seudónimo (opcional, el Chooser elige)
  Alias inventado · puede tener avatar no identificable (ilustración, emoji)
  Sigue sin revelar identidad real
  Útil para tener "personalidad" dentro de la app sin exposición

ESTADO 3 — Verificado anónimo (fase avanzada — no en MVP)
  La plataforma verifica que es una persona real mediante liveness detection:
  el usuario mueve la cara · el sistema recoge puntos biométricos ·
  verifica que las fotos del perfil corresponden a esa persona real
  El Presenter ve badge "Persona verificada" — NO los datos biométricos
  Los datos biométricos se almacenan cifrados · nunca accesibles en el día a día
  ── IMPORTANTE: SIN DNI nunca, ni para Chooser ni para Presenter ──
```

**MVP (fase 0-1):** verificación = número de teléfono único por cuenta.
El badge "Verificado" en el MVP significa sólo esto — sin biometría, sin documento.

**Fase avanzada:** liveness detection con cámara (mover la cara, puntos biométricos).
Sin necesidad de documento de identidad en ningún momento del roadmap.

---

## Anonimato del Presenter — depende de la vertical

```
dating:      Presenter SIEMPRE tiene foto visible en Capa 1
             Es el producto que ofrece — sin foto no hay interés
             El nombre puede ser alias, la foto debe ser real (moderada por IA)

masajes:     Presenter puede ser anónimo — se muestra el local, no la persona
             La foto es del espacio, no del terapeuta

automoción:  Presenter puede ser anónimo — se muestra el vehículo o el local
             Sin necesidad de foto personal
```

---

## Las tres capas

```
CAPA 1 — Pública · visible a cualquier usuario de la vertical
═══════════════════════════════════════════════════════════════
  Quién la ve:   cualquier usuario que entre a esa vertical
  Se revela:     siempre, sin condiciones
  Cifrado:       ninguno — datos en claro en BD global

  dating (Presenter):   foto principal · alias · rango de edad · ciudad ·
                        intereses generales (máx 5 tags) · idiomas ·
                        disponibilidad

  dating (Chooser):     NADA visible públicamente en Capa 1 ·
                        el Presenter sólo ve su score y badges
                        cuando recibe un contacto

  masajes:              foto del local · nombre del negocio · barrio ·
                        servicios sin precio · horario general

  automoción:           foto del local/vehículo · nombre · ubicación ·
                        tipo de dealer

  ─────────────────────────────────────────────────────────────
  ↓  El Chooser contacta · la plantilla del Presenter evalúa · MATCH
  ─────────────────────────────────────────────────────────────

CAPA 2 — Match · visible tras interés mutuo verificado
═══════════════════════════════════════════════════════════════
  Quién la ve:   sólo el par (Chooser + Presenter) que han conectado
  Se revela:     automáticamente al producirse el match
  Cifrado:       AES-256-GCM · clave compartida entre el par

  dating (Presenter):   fotos adicionales (máx 6) · tipo de relación ·
                        nivel económico como rango · gustos detallados ·
                        orientación (si elige compartirla) · altura

  dating (Chooser):     alias · avatar (si tiene) · intereses generales ·
                        reputación detallada por dimensión ·
                        nº de matches anteriores (rango, no exacto)

  masajes:              precios · duración · reviews completas ·
                        fotos adicionales · política de cancelación

  automoción:           precios · historial · condiciones de venta

  ─────────────────────────────────────────────────────────────
  ↓  El usuario decide activamente compartir más — nunca automático
  ─────────────────────────────────────────────────────────────

CAPA 3 — Confianza · el usuario controla qué comparte y con quién
═══════════════════════════════════════════════════════════════
  Quién la ve:   sólo quien el usuario autoriza explícitamente · acción manual
  Se revela:     NUNCA automáticamente
  Cifrado:       AES-256-GCM · cifrado con DEK del propio usuario ·
                 descifrado CLIENT-SIDE únicamente · el servidor nunca ve en claro

  dating:        número de teléfono · redes sociales · preferencias íntimas ·
                 cualquier dato que el usuario considere muy personal
                 ── SIN nombre real ni documento de identidad ──

  masajes:       teléfono directo · dirección exacta · descuento habitual

  automoción:    documentación del vehículo · contacto directo
```

---

## Modelo de datos

```sql
-- Datos de perfil organizados por capa
-- Cada capa tiene su propio nivel de cifrado

CREATE TABLE user_profile_layers (
  user_id       UUID NOT NULL REFERENCES users(id),
  vertical      TEXT NOT NULL,
  -- Capa 1: en claro, indexable, para búsqueda y deck
  layer1        JSONB NOT NULL DEFAULT '{}',
  -- Capa 2: cifrada con clave compartida del match
  -- Se descifra en el servidor cuando ambos han hecho match
  layer2_enc    BYTEA,
  -- Capa 3: cifrada con DEK del propio usuario
  -- NUNCA se descifra en el servidor — sólo client-side
  layer3_enc    BYTEA,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, vertical)
);

-- Qué capas ha autorizado compartir con quién
-- Registro inmutable — cuando se comparte no se puede "des-compartir"
-- (el otro usuario ya ha visto los datos)
CREATE TABLE profile_layer_grants (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grantor_id      UUID NOT NULL,   -- quien comparte
  grantee_id      UUID NOT NULL,   -- con quién
  vertical        TEXT NOT NULL,
  layer           INTEGER NOT NULL CHECK (layer IN (2, 3)),
  -- Clave de descifrado de esa capa, cifrada con la DEK del grantee
  -- El grantee descifra con su propia DEK para obtener la clave de la capa
  layer_key_enc   BYTEA NOT NULL,
  granted_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (grantor_id, grantee_id, vertical, layer)
);
```

---

## Flujo de descifrado de capas

```typescript
// packages/kernel/src/profile/layer-decryption.ts

// Capa 1 — siempre disponible, sin descifrado
async function getLayer1(userId: string, vertical: string): Promise<Layer1Data> {
  return profileRepo.getLayer1(userId, vertical);
}

// Capa 2 — disponible tras match, descifrada en servidor
async function getLayer2AfterMatch(
  requesterId: string,
  targetId: string,
  vertical: string,
  requesterDek: Uint8Array,
): Promise<Layer2Data | null> {
  // Verificar que hay match real entre los dos usuarios
  const match = await matchRepo.findMatch(requesterId, targetId, vertical);
  if (!match) return null;

  // Obtener el grant de la capa 2
  const grant = await grantRepo.find(targetId, requesterId, vertical, 2);
  if (!grant) return null;

  // Descifrar la clave de la capa 2 con la DEK del requester
  const layerKey = await decryptField(grant.layerKeyEnc, requesterDek);

  // Descifrar los datos de la capa 2 con la clave de la capa
  const layer2Raw = await profileRepo.getLayer2Enc(targetId, vertical);
  return decryptLayer(layer2Raw, layerKey);
}

// Capa 3 — NUNCA se descifra en el servidor
// El servidor entrega layer3_enc y la clave cifrada con DEK del grantee
// El cliente descifra: primero la clave con su DEK, luego los datos con esa clave
async function getLayer3Package(
  requesterId: string,
  targetId: string,
  vertical: string,
): Promise<Layer3Package | null> {
  const grant = await grantRepo.find(targetId, requesterId, vertical, 3);
  if (!grant) return null;

  return {
    layer3Enc: await profileRepo.getLayer3Enc(targetId, vertical),
    layerKeyEnc: grant.layerKeyEnc,
    // El cliente recibe esto y descifra localmente con su DEK
    // El servidor nunca ve los datos en claro de la capa 3
  };
}
```

---

## Cuándo se comparte cada capa automáticamente

```typescript
// La Capa 2 se comparte automáticamente al producirse el match
// La Capa 3 siempre es manual — nunca automática

async function onMatchCreated(userId1: string, userId2: string, vertical: string): Promise<void> {
  // Compartir Capa 2 en ambas direcciones automáticamente
  await shareLayer2(userId1, userId2, vertical);
  await shareLayer2(userId2, userId1, vertical);

  // Notificar a ambos que ahora pueden verse más info
  await queue.publish('send-notification', {
    type: 'match_layer2_unlocked',
    userId1,
    userId2,
    vertical,
  });
}

async function shareLayer3(
  grantorId: string,
  granteeId: string,
  vertical: string,
  grantorDek: Uint8Array,
): Promise<void> {
  // El grantor decide activamente compartir
  // Se registra en profile_layer_grants
  // Irreversible: el grantee ya ha visto los datos si los descifró
  await grantRepo.create({
    grantorId,
    granteeId,
    vertical,
    layer: 3,
    layerKeyEnc: await prepareLayerKeyForGrantee(grantorId, granteeId, vertical, 3, grantorDek),
    grantedAt: new Date(),
  });

  await queue.publish('send-notification', {
    type: 'profile_layer3_shared',
    grantorId,
    granteeId,
    vertical,
  });
}
```

---

## La vertical como cobertura social

Un usuario puede tener perfiles en múltiples verticales simultáneamente.
El perfil de cada vertical es completamente independiente — mismas fotos o distintas,
mismo nombre o distinto, misma bio o adaptada al contexto.

```typescript
// Un usuario tiene perfil en 'cars' y en 'dating' — son independientes
// En 'cars' su Capa 1 muestra: "Busco coche familiar, Madrid"
// En 'dating' su Capa 1 muestra: foto, edad, ciudad, intereses

// El sistema nunca cruza datos entre verticales de un mismo usuario
// (a menos que el usuario lo autorice explícitamente en el futuro)

interface UserVerticalProfiles {
  userId: string;
  profiles: {
    vertical: string;
    layer1: Record<string, unknown>; // en claro
    hasLayer2: boolean; // ¿ha rellenado la capa 2?
    hasLayer3: boolean; // ¿ha rellenado la capa 3?
    isActive: boolean; // puede aparecer en búsquedas
    role: 'presenter' | 'chooser'; // rol en esta vertical
  }[];
}
```

---

## Moderación de imágenes por capa

```
Capa 1 (foto principal): moderación estricta
  · NSFW: rechazo automático si score > 0.3
  · Cara: según vertical (dating: requerida · masajes: prohibida)
  · Resolución mínima: 400×400px

Capa 2 (fotos adicionales): moderación normal
  · NSFW: rechazo automático si score > 0.5
  · Máximo 6 fotos

Capa 3: no moderada por IA — el usuario la gestiona
  · Almacenada cifrada con DEK del usuario
  · La plataforma no puede ver esta capa
```

---

## Bloqueo de capturas de pantalla

La capacidad de capturar pantalla se configura por vertical.
En dating está bloqueada por defecto — no es opcional para el usuario.

### App móvil (Flutter) — bloqueo nativo

```dart
// apps/mobile/lib/core/security/screen_capture_guard.dart

import 'package:flutter_windowmanager/flutter_windowmanager.dart';

class ScreenCaptureGuard {
  // Llamar al entrar a una vertical con blockScreenCapture: true
  static Future<void> enable() async {
    await FlutterWindowManager.addFlags(FlutterWindowManager.FLAG_SECURE);
    // FLAG_SECURE:
    //   · Bloquea capturas de pantalla
    //   · Bloquea grabación de pantalla
    //   · Muestra negro en el selector de apps recientes
    //   · Bloquea que otras apps lean el contenido de la pantalla
  }

  // Llamar al salir de la vertical protegida
  static Future<void> disable() async {
    await FlutterWindowManager.clearFlags(FlutterWindowManager.FLAG_SECURE);
  }
}

// Uso en el router de la app
// Cuando el usuario entra a la vertical dating → enable()
// Cuando sale → disable()
// La vertical cars no activa esto
```

### Web — watermarking invisible por sesión

En web es imposible bloquear capturas técnicamente al 100%.
La defensa es el **marcado invisible por usuario**: cada imagen se sirve
con una marca única por sesión. Si aparece una captura filtrada en otro sitio,
la plataforma puede identificar qué cuenta la filtró.

```typescript
// apps/api/src/modules/media/use-cases/ServeProtectedImage.ts

export class ServeProtectedImageUseCase {
  async execute(imageId: string, userId: string, sessionId: string): Promise<Buffer> {
    const image = await mediaRepo.findById(imageId);

    // Sólo aplicar watermark en verticales protegidas
    const vertical = await verticalRepo.findByImageId(imageId);
    if (!vertical.config.security.imageWatermarking) {
      return image.buffer;
    }

    // Marca invisible: modifica píxeles específicos con ID de sesión
    // Imperceptible al ojo humano · detectable con análisis forense
    const watermarkPayload = `${userId}:${sessionId}:${Date.now()}`;
    return applyInvisibleWatermark(image.buffer, watermarkPayload);
  }
}
```

### Configuración de seguridad por vertical

```typescript
// Añadir a VerticalConfig en 10-vertical-system.md

interface VerticalSecurityConfig {
  blockScreenCapture: boolean; // dating: true · masajes: false · cars: false
  imageWatermarking: boolean; // dating: true · masajes: false · cars: false
  blurInAppSwitcher: boolean; // dating: true (aparece negro al cambiar de app)
  requireBiometricToOpen: boolean; // false en MVP — opcional en fase avanzada
}

// Configuraciones por vertical:
// dating:     { blockScreenCapture: true,  imageWatermarking: true,  blurInAppSwitcher: true  }
// masajes:    { blockScreenCapture: false, imageWatermarking: false, blurInAppSwitcher: false }
// automoción: { blockScreenCapture: false, imageWatermarking: false, blurInAppSwitcher: false }
```

---

## Roadmap de verificación de identidad

```
MVP (fase 0-1):
  Verificación = número de teléfono único por cuenta
  Badge "Verificado" significa: una persona real con teléfono único
  Sin biometría · sin documento

Fase avanzada (post-lanzamiento, cuando haya tracción):
  Liveness detection con cámara del dispositivo:
    · El usuario mueve la cara siguiendo instrucciones
    · El sistema recoge puntos biométricos
    · Verifica que las fotos del perfil son de esa persona real
    · Badge "Persona verificada" — mayor confianza para el Presenter
  Sin DNI · sin pasaporte · sin documento en ningún momento del roadmap
  Los datos biométricos se almacenan cifrados con DEK del usuario
  La plataforma no puede acceder a ellos salvo requerimiento legal formal
```
