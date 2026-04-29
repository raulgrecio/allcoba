# 25 · Modelo de matching — Presenter, Chooser y filtrado inteligente

> El Chooser tiene el control del primer contacto en todas las verticales.
> El Presenter no puede iniciar contacto — sólo puede preparar su perfil y definir
> qué mensajes acepta mediante una plantilla de filtrado.
> Esto resuelve estructuralmente el problema de asimetría de volumen.

---

## Por qué este modelo

En plataformas simétricas (Tinder, Bumble) el problema de volumen es endémico:
el lado con más oferta recibe más mensajes de los que puede gestionar,
y el lado con menos oferta envía mensajes que mayoritariamente no reciben respuesta.
Ningún algoritmo lo resuelve — es un problema estructural del modelo.

La asimetría de roles lo resuelve en la raíz:

```
Modelo simétrico (Tinder):
  Hombre envía 100 likes → recibe 1 match → frustrante
  Mujer  recibe 100 likes → 100 matches → abrumador

Modelo Presenter/Chooser:
  Presenter publica perfil cuidado → espera
  Chooser navega sin presión → contacta cuando hay interés real
  → Ambas experiencias mejoran
```

Este modelo no impone una jerarquía moral — el rol (quién es Presenter,
quién es Chooser) lo define el mercado y, en algunos casos, el propio usuario.

---

## Definición de roles

```typescript
// packages/domain/src/matching/roles.ts

type MatchRole = 'presenter' | 'chooser'

// Configuración de roles por mercado y vertical
// El sistema sabe en qué contexto opera y asigna el rol por defecto
// El usuario puede cambiarlo si el mercado lo permite

interface MarketRoleConfig {
  market:          string     // código de país o región: 'ES', 'AE', 'LATAM'...
  vertical:        string
  defaultPresenter: 'male' | 'female' | 'any'   // quién es Presenter por defecto
  defaultChooser:   'male' | 'female' | 'any'
  allowRoleSwap:   boolean   // ¿puede el usuario cambiar su rol?
  symmetric:       boolean   // si true: ambos son Presenter y Chooser a la vez
}

// Ejemplos de configuración
const MARKET_ROLE_CONFIGS: MarketRoleConfig[] = [
  // España / Europa occidental — simétrico
  {
    market:          'ES',
    vertical:        'dating',
    defaultPresenter: 'any',
    defaultChooser:   'any',
    allowRoleSwap:   true,
    symmetric:       true,
  },
  // Latinoamérica — hombre Presenter, mujer Chooser por defecto
  // pero intercambiable
  {
    market:          'LATAM',
    vertical:        'dating',
    defaultPresenter: 'male',
    defaultChooser:   'female',
    allowRoleSwap:   true,
    symmetric:       false,
  },
  // Países árabes — asimétrico, no intercambiable en MVP
  {
    market:          'AE',
    vertical:        'dating',
    defaultPresenter: 'male',
    defaultChooser:   'female',
    allowRoleSwap:   false,
    symmetric:       false,
  },
  // Comunidades LGBTQ+ — siempre simétrico
  {
    market:          'LGBTQ',
    vertical:        'dating',
    defaultPresenter: 'any',
    defaultChooser:   'any',
    allowRoleSwap:   true,
    symmetric:       true,
  },
]
```

---

## Orientación como filtro

La orientación no es un rol — es un filtro de visibilidad.
Determina qué perfiles aparecen en el deck de cada usuario.

```typescript
// packages/domain/src/matching/orientation-filter.ts

type Orientation = 'straight' | 'gay' | 'lesbian' | 'bisexual'
type Gender      = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say'

// Matriz de visibilidad: quién ve a quién en el deck
function canSeeInDeck(
  viewer: { gender: Gender; orientation: Orientation },
  target: { gender: Gender; orientation: Orientation }
): boolean {
  // Un usuario sólo aparece en el deck de otro si habría interés potencial mutuo
  const viewerInterestedIn = getInterestedIn(viewer.orientation, viewer.gender)
  const targetInterestedIn = getInterestedIn(target.orientation, target.gender)

  return (
    viewerInterestedIn.includes(target.gender) &&
    targetInterestedIn.includes(viewer.gender)
  )
}

function getInterestedIn(orientation: Orientation, gender: Gender): Gender[] {
  switch (orientation) {
    case 'straight':  return gender === 'male' ? ['female'] : ['male']
    case 'gay':       return gender === 'male' ? ['male']   : ['female']
    case 'lesbian':   return ['female']
    case 'bisexual':  return ['male', 'female', 'non_binary']
  }
}
```

---

## Plantilla de filtrado del Presenter

El Presenter define reglas que determinan qué pasa con cada mensaje entrante
antes de que llegue a su bandeja de entrada. Es automático — no requiere
que el Presenter revise cada mensaje manualmente.

### Modelo de datos

```sql
-- Plantilla de filtrado: el Presenter la define una vez
-- Se aplica automáticamente a cada mensaje entrante
CREATE TABLE presenter_filter_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id),
  vertical      TEXT NOT NULL,
  -- Acción por defecto si no se cumple ninguna regla
  default_action TEXT NOT NULL DEFAULT 'archive'
                 CHECK (default_action IN ('accept', 'archive', 'reject')),
  -- Las reglas se evalúan en orden — la primera que coincide gana
  rules          JSONB NOT NULL DEFAULT '[]',
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, vertical)
);

-- Estructura de una regla dentro del JSONB:
-- {
--   "condition": {
--     "field":    "trust_score.punctuality", -- campo del trust score del Chooser
--     "operator": "lt",                    -- lt | gt | eq | gte | lte
--     "value":    2.5
--   },
--   "action":    "reject",                 -- accept | archive | reject
--   "reason":    "reputación insuficiente" -- mensaje interno del Presenter
-- }
```

### Campos disponibles como condición de filtrado

```typescript
// Qué puede usar el Presenter como criterio de filtrado
// Todos son datos públicos o trust signals anonimizados — sin PII del Chooser

interface FilterableChooserFields {
  // Trust signals (cross-platform, anonimizados)
  'trust_score.overall':       number   // 0-5
  'trust_score.punctuality':   number
  'trust_score.communication': number

  // Actividad en la plataforma
  'total_interactions':        number   // cuántas interacciones verificadas tiene
  'is_verified':               boolean  // ha verificado identidad

  // En vertical dating: datos de Capa 1 (públicos)
  'age':                       number
  'has_profile_photo':         boolean
  'profile_completeness':      number   // 0-100%
}

// Ejemplo de plantilla real para un masajista:
const massageTemplate = {
  defaultAction: 'accept',
  rules: [
    {
      // Rechazar usuarios con trust score muy bajo
      condition: { field: 'trust_score.overall', operator: 'lt', value: 2.0 },
      action:    'reject',
      reason:    'reputación insuficiente',
    },
    {
      // Archivar usuarios sin interacciones verificadas
      condition: { field: 'total_interactions', operator: 'lt', value: 1 },
      action:    'archive',
      reason:    'usuario sin historial',
    },
  ],
}

// Ejemplo de plantilla para dating (mercado LATAM):
const datingTemplate = {
  defaultAction: 'archive',   // por defecto archivar — sólo llegan los que superan filtros
  rules: [
    {
      // Aceptar directamente usuarios verificados con buen score
      condition: { field: 'is_verified', operator: 'eq', value: true },
      action:    'accept',
    },
    {
      // Archivar usuarios sin foto de perfil
      condition: { field: 'has_profile_photo', operator: 'eq', value: false },
      action:    'archive',
    },
    {
      // Rechazar usuarios con muy mala reputación
      condition: { field: 'trust_score.overall', operator: 'lt', value: 1.5 },
      action:    'reject',
    },
  ],
}
```

### Motor de evaluación de plantillas

```typescript
// apps/api/src/modules/matching/application/use-cases/EvaluateFilterTemplate.ts

export class EvaluateFilterTemplateUseCase {
  async execute(
    presenterId: string,
    chooserHash: string,
    vertical: string
  ): Promise<FilterAction> {
    // 1. Cargar plantilla del Presenter
    const template = await templateRepo.find(presenterId, vertical)
    if (!template || !template.isActive) {
      return 'accept'   // sin plantilla: aceptar todo
    }

    // 2. Cargar trust signals públicos del Chooser (sin PII)
    const chooserSignals = await trustScoreRepo.getPublicSignals(chooserHash)
    const chooserProfile = await profileRepo.getLayer1Public(chooserHash, vertical)

    // 3. Evaluar reglas en orden — primera que coincide gana
    for (const rule of template.rules) {
      if (evaluateCondition(rule.condition, { ...chooserSignals, ...chooserProfile })) {
        return rule.action
      }
    }

    return template.defaultAction
  }
}

function evaluateCondition(
  condition: FilterCondition,
  data: Record<string, unknown>
): boolean {
  const value = getNestedValue(data, condition.field)
  switch (condition.operator) {
    case 'lt':  return (value as number) <  condition.value
    case 'gt':  return (value as number) >  condition.value
    case 'gte': return (value as number) >= condition.value
    case 'lte': return (value as number) <= condition.value
    case 'eq':  return value === condition.value
  }
}

type FilterAction = 'accept' | 'archive' | 'reject'
```

### Qué significa cada acción

```
ACCEPT   → el mensaje llega a la bandeja principal del Presenter con notificación push
ARCHIVE  → el mensaje se guarda pero sin notificación · el Presenter lo ve cuando quiere
           · el Chooser no sabe que fue archivado (experiencia normal para él)
REJECT   → el mensaje no se entrega · el Chooser recibe "Este perfil no acepta nuevos
           contactos en este momento" (genérico — no revela el motivo del rechazo)
```

---

## Flujo completo de primer contacto

```
CHOOSER navega el deck de Presenters
          │
          ▼
CHOOSER da like a un Presenter
          │
          ▼
[Sistema] Evalúa plantilla de filtrado del Presenter
          │
          ├── REJECT → Chooser recibe mensaje genérico · fin del flujo
          │
          ├── ARCHIVE → Mensaje guardado sin notificación al Presenter
          │             El Presenter puede verlo cuando quiera
          │             El Chooser ve "mensaje enviado" normalmente
          │
          └── ACCEPT → Notificación push al Presenter
                       "Alguien está interesado" (sin revelar quién)
                              │
                              ▼
                       Presenter ve el perfil del Chooser (Capa 1 únicamente)
                              │
                       ┌──────┴──────┐
                       │             │
                       ▼             ▼
                    ACEPTA        RECHAZA (silencia/bloquea)
                       │             │
                       ▼             │
                   MATCH creado      │
                   Capa 2 desbloqueada
                   Chat abierto
                   Ambos se notifican
```

---

## Entidad Match

```typescript
// packages/domain/src/matching/match.entity.ts

interface Match {
  id:           string
  vertical:     string
  presenterId:  string
  chooserId:    string
  status:       MatchStatus
  // Cuándo se desbloqueó cada capa
  layer2UnlockedAt: Date | null
  layer3UnlockedAt: Date | null   // sólo si alguno compartió capa 3
  createdAt:    Date
  lastActivityAt: Date
}

type MatchStatus =
  | 'pending'     // Chooser ha dado like, Presenter aún no ha visto
  | 'active'      // match confirmado, chat abierto
  | 'expired'     // sin actividad en 30 días
  | 'unmatched'   // uno de los dos deshizo el match
```

```sql
-- Tabla global de matches
CREATE TABLE matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical            TEXT NOT NULL,
  presenter_id        UUID NOT NULL REFERENCES users(id),
  chooser_id          UUID NOT NULL REFERENCES users(id),
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','active','expired','unmatched')),
  filter_action       TEXT NOT NULL,   -- 'accept' | 'archive' — qué hizo la plantilla
  layer2_unlocked_at  TIMESTAMPTZ,
  last_activity_at    TIMESTAMPTZ DEFAULT now(),
  created_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vertical, presenter_id, chooser_id)
);

CREATE INDEX idx_matches_presenter ON matches(presenter_id, vertical, status);
CREATE INDEX idx_matches_chooser   ON matches(chooser_id, vertical, status);
```

---

## UI de la plantilla de filtrado (panel del Presenter)

La plantilla se configura con una UI visual — no con código.
El Presenter elige condiciones de una lista y arrastra para ordenar las reglas.

```
┌─────────────────────────────────────────────────┐
│  Filtros de contacto — Vertical: Dating         │
│                                                 │
│  Si alguien te contacta, ¿qué haces por         │
│  defecto?    [ Aceptar ] [Archivar ●] [Rechazar]│
│                                                 │
│  Reglas adicionales (se evalúan en orden):      │
│  ┌───────────────────────────────────────────┐  │
│  │ ✓ Si está verificado      → Aceptar       │  │
│  │ ─ Si puntuación < 2.0     → Archivar      │  │
│  │ ─ Si sin foto             → Archivar      │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  + Añadir regla                                 │
└─────────────────────────────────────────────────┘
```

---

## Endpoints

```
# Deck y swipe (Chooser)
GET  /api/v1/discovery/:vertical/deck           ← deck personalizado para el Chooser
POST /api/v1/discovery/:vertical/contact        ← Chooser contacta a un Presenter
                                                   { presenterId, message? }

# Match (ambos)
GET  /api/v1/matches                            ← lista de matches activos
GET  /api/v1/matches/:id                        ← detalle del match
DELETE /api/v1/matches/:id                      ← deshacer match

# Plantilla de filtrado (Presenter)
GET  /api/v1/me/filter-template/:vertical       ← ver plantilla actual
PUT  /api/v1/me/filter-template/:vertical       ← actualizar plantilla
     Body: { defaultAction, rules[] }

# Bandeja del Presenter
GET  /api/v1/me/contacts/inbox                  ← mensajes aceptados
GET  /api/v1/me/contacts/archived               ← mensajes archivados
POST /api/v1/me/contacts/:matchId/accept        ← aceptar desde archivados
POST /api/v1/me/contacts/:matchId/reject        ← rechazar desde archivados
```

---

## Notas de privacidad y ética

```
1. El Chooser es anónimo por defecto en todas las verticales — siempre
2. El Presenter en dating SIEMPRE tiene foto visible · en otras verticales puede ser anónimo
3. SIN DNI nunca, ni para Chooser ni para Presenter — decisión de diseño permanente
4. La verificación en MVP = número de teléfono único
5. Liveness detection (biometría facial) = fase avanzada, sin documento de identidad
6. El Chooser nunca sabe si fue archivado o rechazado — siempre ve "mensaje enviado"
7. El motivo del rechazo/archivo nunca se revela al Chooser
8. Las reglas del Presenter son privadas — ni la plataforma las muestra al Chooser
9. Los trust signals usados en filtros son anonimizados — sin trazabilidad a interacciones concretas
10. El Presenter NO puede filtrar por raza, religión ni características protegidas —
    la lista de campos filtrables está cerrada y auditada
11. platform_admin puede auditar plantillas denunciadas sin acceder a Capa 3 de nadie
12. La reputación acumulada es la identidad del Chooser — más valiosa que el nombre real
```
