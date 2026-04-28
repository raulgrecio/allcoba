# 22 · Citas y CRM del provider

> El provider publica su disponibilidad mediante una plantilla semanal.
> El consumer reserva directamente en los slots disponibles.
> Cada servicio tiene un tiempo de descanso configurable (por defecto = duración del servicio).
> Las citas son la entidad central del CRM — su conteo por cliente es la métrica clave.

---

## Verticales con citas

Opt-in por vertical mediante `features.appointments`:

```
hairdresser:  appointments: true
massage:      appointments: true   ← tiempo de descanso especialmente relevante
real-estate:  appointments: false
car:          appointments: true   ← para pruebas de conducción / revisiones
```

---

## Modelo de datos

### Plantilla semanal del provider

```sql
-- Plantilla que define el horario habitual del provider
-- Sirve como base para generar slots automáticamente
CREATE TABLE provider_schedule_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id),
  -- 0=domingo, 1=lunes ... 6=sábado
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,       -- hora de inicio de la franja (ej: '09:00')
  end_time    TIME NOT NULL,       -- hora de fin de la franja (ej: '14:00')
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (provider_id, day_of_week, start_time)
);

CREATE INDEX idx_schedule_provider ON provider_schedule_templates(provider_id);
```

### Configuración de descanso por servicio

```sql
-- Cada servicio del provider tiene su propio tiempo de descanso
-- Por defecto: buffer_after_min = duration_min (descanso = duración del servicio)
-- El provider puede cambiarlo individualmente
CREATE TABLE provider_service_config (
  provider_id      UUID NOT NULL REFERENCES providers(id),
  service_id       UUID NOT NULL,    -- referencia al catálogo de servicios
  duration_min     INTEGER NOT NULL, -- duración real del servicio
  buffer_after_min INTEGER NOT NULL, -- descanso tras el servicio
  -- buffer_after_min DEFAULT = duration_min (se calcula al crear el servicio)
  -- El provider puede modificarlo: un masaje de 60min puede tener 30min de buffer
  max_per_day      INTEGER,          -- máximo de este servicio por día (NULL = sin límite)
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (provider_id, service_id)
);
```

### Slots de disponibilidad (generados desde la plantilla + editables)

```sql
-- Slots concretos de tiempo disponible para reserva
-- Generados automáticamente desde la plantilla semanal
-- Editables individualmente por el provider
CREATE TABLE appointment_slots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES providers(id),
  service_id   UUID,               -- NULL = cualquier servicio del catálogo
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ NOT NULL,
  -- Tiempo de descanso DESPUÉS de este slot (copiado del service_config al generar)
  -- No ocupa un slot propio — es un margen que el sistema respeta al calcular disponibilidad
  buffer_after_min INTEGER NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'available'
               CHECK (status IN ('available', 'booked', 'blocked', 'cancelled')),
  -- Origen del slot: ¿fue generado por la plantilla o creado manualmente?
  origin       TEXT NOT NULL DEFAULT 'template'
               CHECK (origin IN ('template', 'manual')),
  notes        TEXT,               -- nota interna del provider
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_slots_provider_available
  ON appointment_slots(provider_id, starts_at)
  WHERE status = 'available';

CREATE INDEX idx_slots_public
  ON appointment_slots(provider_id, starts_at, status);
```

### Citas (entidad CRM — en schema cifrado del provider)

```sql
CREATE TABLE provider_{id}.appointments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id                 UUID NOT NULL,
  customer_id             UUID REFERENCES provider_{id}.customers(id),
  consumer_hash           TEXT NOT NULL,
  service_id              UUID,
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending',    -- reservada, pendiente de confirmación
                            'confirmed',  -- provider confirmó
                            'completed',  -- cita realizada
                            'cancelled',  -- cancelada
                            'no_show'     -- el consumer no apareció
                          )),
  cancelled_by            TEXT CHECK (cancelled_by IN ('provider', 'consumer', 'system')),
  cancelled_at            TIMESTAMPTZ,
  cancellation_reason_enc BYTEA,      -- cifrado con DEK del provider
  notes_enc               BYTEA,      -- notas del provider (cifradas)
  consumer_notes_enc      BYTEA,      -- petición del consumer al reservar (cifrada)
  reminder_24h_sent       BOOLEAN DEFAULT false,
  reminder_2h_sent        BOOLEAN DEFAULT false,
  duration_min            INTEGER,    -- duración real del servicio
  buffer_after_min        INTEGER,    -- descanso planificado tras la cita
  booked_at               TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_appt_upcoming
  ON provider_{id}.appointments(status, slot_id)
  WHERE status IN ('pending', 'confirmed');

-- Estadísticas CRM en claro — para consultas rápidas sin descifrar
CREATE TABLE provider_{id}.customer_stats (
  customer_id          UUID PRIMARY KEY
                       REFERENCES provider_{id}.customers(id),
  total_appointments   INTEGER DEFAULT 0,
  completed_count      INTEGER DEFAULT 0,
  cancelled_count      INTEGER DEFAULT 0,
  no_show_count        INTEGER DEFAULT 0,   -- métrica clave del CRM
  total_spent_cents    INTEGER DEFAULT 0,
  first_appointment_at TIMESTAMPTZ,
  last_appointment_at  TIMESTAMPTZ,
  next_appointment_at  TIMESTAMPTZ,         -- próxima cita futura
  updated_at           TIMESTAMPTZ DEFAULT now()
);
```

---

## Generación automática de slots desde la plantilla

El provider define su plantilla semanal una vez. El sistema genera los slots para las próximas N semanas automáticamente y los regenera cuando la plantilla cambia.

```typescript
// apps/api/src/modules/appointments/use-cases/GenerateSlotsFromTemplate.ts

export class GenerateSlotsFromTemplateUseCase {
  async execute(providerId: string, weeksAhead = 4): Promise<void> {
    const templates  = await scheduleRepo.findByProvider(providerId)
    const services   = await serviceConfigRepo.findByProvider(providerId)
    const now        = new Date()
    const endDate    = addWeeks(now, weeksAhead)

    const slotsToCreate: NewSlot[] = []

    for (let day = new Date(now); day < endDate; day = addDays(day, 1)) {
      const dayOfWeek = day.getDay()
      const dayTemplates = templates.filter(t => t.dayOfWeek === dayOfWeek && t.isActive)

      for (const template of dayTemplates) {
        // Generar slots dentro de la franja horaria del template
        // respetando la duración de cada servicio + su buffer
        const slots = generateSlotsForTimeRange(
          day,
          template.startTime,
          template.endTime,
          services,    // cada servicio tiene su duration_min y buffer_after_min
        )
        slotsToCreate.push(...slots)
      }
    }

    // Insertar sólo los slots que no existen ya (idempotente)
    await slotRepo.insertMany(slotsToCreate, { onConflict: 'ignore' })
  }
}

function generateSlotsForTimeRange(
  date: Date,
  startTime: string,    // 'HH:MM'
  endTime: string,
  services: ServiceConfig[]
): NewSlot[] {
  const slots: NewSlot[] = []

  // Generar slots para el servicio de menor duración disponible
  // para maximizar la flexibilidad (el consumer elige el servicio al reservar)
  const minDuration = Math.min(...services.map(s => s.durationMin))
  const maxBuffer   = Math.max(...services.map(s => s.bufferAfterMin))

  let cursor = parseTime(date, startTime)
  const end  = parseTime(date, endTime)

  while (addMinutes(cursor, minDuration) <= end) {
    slots.push({
      providerId:     services[0].providerId,
      serviceId:      null,                  // cualquier servicio
      startsAt:       cursor,
      endsAt:         addMinutes(cursor, minDuration),
      bufferAfterMin: maxBuffer,
      status:         'available',
      origin:         'template',
    })
    // El siguiente slot empieza después del servicio + su buffer
    cursor = addMinutes(cursor, minDuration + maxBuffer)
  }

  return slots
}
```

---

## Tiempo de descanso — cómo funciona

```
Ejemplo: masajista con servicio de 60 min y 30 min de descanso

  09:00 ─────────────────────── 10:00  ← SERVICIO (60 min)
  10:00 ───────────── 10:30           ← DESCANSO (30 min) — no aparece como slot
  10:30 ─────────────────────── 11:30 ← SIGUIENTE SERVICIO
  11:30 ───────────── 12:00           ← DESCANSO
  ...

El consumer ve disponibilidad a las 09:00 y a las 10:30.
Nunca ve las 10:00 — el sistema la oculta por el buffer.

Ejemplo: peluquería con corte de 45 min y 0 min de descanso
  (el corte incluye el tiempo de recogida)

  09:00 ──────────── 09:45 ← SERVICIO
  09:45 ──────────── 10:30 ← SERVICIO (siguiente inmediatamente)
```

### Plantilla por defecto al dar de alta un servicio

```typescript
// Cuando el provider crea un servicio, el buffer se inicializa = duración
// El provider puede cambiarlo después desde su panel

async function createService(
  providerId: string,
  dto: CreateServiceDTO
): Promise<Service> {
  const service = await serviceRepo.create({
    providerId,
    name:        dto.name,
    durationMin: dto.durationMin,
    priceCents:  dto.priceCents,
  })

  // Buffer por defecto = duración del servicio
  await serviceConfigRepo.create({
    providerId,
    serviceId:      service.id,
    durationMin:    dto.durationMin,
    bufferAfterMin: dto.durationMin,   // ← defecto: igual que la duración
    maxPerDay:      null,
  })

  return service
}
```

---

## Reserva atómica (evitar doble reserva)

```typescript
// apps/api/src/modules/appointments/use-cases/BookAppointment.ts

export class BookAppointmentUseCase {
  async execute(dto: BookAppointmentDTO): Promise<Appointment> {
    return db.transaction(async (tx) => {
      // SELECT FOR UPDATE — bloquea el slot durante la transacción
      // Si dos consumers intentan reservar el mismo slot simultáneamente,
      // el segundo espera aquí y después recibe SlotNotAvailableError
      const slot = await tx.execute(sql`
        SELECT * FROM appointment_slots
        WHERE id      = ${dto.slotId}
          AND status  = 'available'
        FOR UPDATE
      `)

      if (!slot.rows[0]) throw new SlotNotAvailableError(dto.slotId)

      // Verificar que el consumer no está bloqueado por este provider
      const relation = await relationRepo.find(slot.rows[0].provider_id, dto.consumerHash)
      if (relation?.status === 'blocked') {
        throw new ContactNotAllowedError()
      }

      // Marcar slot como reservado
      await tx.execute(sql`
        UPDATE appointment_slots SET status = 'booked' WHERE id = ${dto.slotId}
      `)

      // Crear cita en el schema del provider
      const appointment = await appointmentRepo.create(tx, {
        slotId:          dto.slotId,
        providerId:      slot.rows[0].provider_id,
        consumerHash:    dto.consumerHash,
        serviceId:       dto.serviceId,
        status:          'pending',
        durationMin:     slot.rows[0].ends_at - slot.rows[0].starts_at,
        bufferAfterMin:  slot.rows[0].buffer_after_min,
        // consumerNote se cifra cuando el provider la descifra en su sesión
      })

      // Notificar al provider (sin datos del consumer — sólo fecha/servicio)
      await queue.publishInTransaction(tx, 'send-notification', {
        type:        'new_appointment',
        recipientId: slot.rows[0].provider_id,
        data: {
          appointmentId: appointment.id,
          startsAt:      slot.rows[0].starts_at,
        },
      })

      return appointment
    })
  }
}
```

---

## Estados de una cita y transiciones

```
Consumer reserva
      │
      ▼
  PENDING ──────────────────────────────────── CANCELLED
      │         (provider rechaza / no responde 24h → sistema cancela)
      │ Provider confirma
      ▼
  CONFIRMED ────────────────────────────────── CANCELLED
      │                                    (cualquiera cancela)
      │ Día de la cita
      ├──────────────────┐
      ▼                  ▼
  COMPLETED          NO_SHOW
  (provider          (provider marca
   confirma           que no vino)
   asistencia)
        │                  │
        └──────────┬────────┘
                   ▼
        Se habilita calificación mutua
        (cooldown 24h desde completed/no_show)
```

---

## Recordatorios automáticos (jobs en cola)

```typescript
// Cron cada 15 minutos — busca citas que necesitan recordatorio

export async function sendAppointmentReminders(): Promise<void> {
  const now = new Date()

  // Recordatorio 24h antes
  const for24h = await db.execute(sql`
    SELECT a.id, a.provider_id, s.starts_at
    FROM appointments a
    JOIN appointment_slots s ON s.id = a.slot_id
    WHERE a.status = 'confirmed'
      AND a.reminder_24h_sent = false
      AND s.starts_at BETWEEN ${addHours(now, 23)} AND ${addHours(now, 25)}
  `)
  for (const appt of for24h.rows) {
    await queue.publish('send-notification', {
      type: 'appointment_reminder_24h', appointmentId: appt.id,
    })
    await db.execute(sql`
      UPDATE appointments SET reminder_24h_sent = true WHERE id = ${appt.id}
    `)
  }

  // Recordatorio 2h antes — mismo patrón con ventana 1.5h-2.5h
}

// Cancelación automática de citas sin confirmar tras 24h
export async function cancelUnconfirmedAppointments(): Promise<void> {
  const cutoff = subHours(new Date(), 24)
  const stale = await db.execute(sql`
    SELECT id, provider_id FROM appointments
    WHERE status = 'pending' AND booked_at < ${cutoff}
  `)
  for (const appt of stale.rows) {
    await db.execute(sql`
      UPDATE appointments
      SET status = 'cancelled', cancelled_by = 'system', cancelled_at = now()
      WHERE id = ${appt.id}
    `)
    await queue.publish('send-notification', {
      type: 'appointment_cancelled', appointmentId: appt.id, cancelledBy: 'system',
    })
  }
}
```

---

## Dashboard CRM del provider

```typescript
// GET /api/v1/me/stats/appointments?period=month

interface AppointmentStats {
  period: 'week' | 'month' | 'quarter' | 'year'

  // Volumen
  totalAppointments:     number
  completedAppointments: number
  cancelledAppointments: number
  noShowCount:           number
  noShowRate:            number   // % — métrica clave de calidad del cliente

  // Económico
  totalRevenueCents:     number
  avgTicketCents:        number

  // Clientes
  uniqueCustomers:       number
  returningCustomers:    number
  retentionRate:         number

  // Ocupación (para optimizar la plantilla)
  occupancyRate:         number   // % de slots disponibles que se reservaron
  avgBufferUsedMin:      number   // tiempo de descanso real promedio

  // Top servicios
  byService: {
    serviceId:   string
    serviceName: string
    count:       number
    revenueCents: number
  }[]

  // Por día de semana (para ajustar la plantilla semanal)
  byDayOfWeek: {
    day:   0|1|2|3|4|5|6
    count: number
    occupancyRate: number
  }[]
}
```

---

## Ficha de cliente con historial de citas (CRM)

```typescript
// GET /api/v1/me/customers/:customerId
// Requiere DEK activa en sesión del provider

interface CustomerCRMProfile {
  id:    string
  // PII descifrados con DEK del provider
  name:  string
  phone: string
  email: string | null
  notes: string | null    // notas privadas del provider

  // Estadísticas en claro — consulta rápida sin descifrar
  stats: {
    totalAppointments:  number
    completedCount:     number
    cancelledCount:     number
    noShowCount:        number   // ← alerta si es alto
    totalSpentCents:    number
    firstAppointmentAt: string | null
    lastAppointmentAt:  string | null
    nextAppointmentAt:  string | null
  }

  // Etiquetas IA (sin PII)
  tags: CustomerTags

  // Historial de citas (descifrado)
  appointments: {
    id:          string
    startsAt:    string
    serviceName: string
    status:      AppointmentStatus
    priceCents:  number | null
    notes:       string | null
    bufferMin:   number
  }[]

  // Trust signals públicos del consumer (cross-provider, anónimos)
  trustSignals: PublicConsumerSignals
}
```

---

## Endpoints completos

```
# Públicos (consumer)
GET    /api/v1/providers/:slug/slots              ← disponibilidad pública (próx. 4 semanas)
POST   /api/v1/appointments                       ← reservar { slotId, serviceId?, note? }
DELETE /api/v1/appointments/:id                   ← cancelar (consumer)
GET    /api/v1/me/appointments                    ← mis citas (consumer)

# Provider autenticado — agenda
GET    /api/v1/me/appointments                    ← agenda { date, view: day|week|month }
GET    /api/v1/me/appointments/:id
PATCH  /api/v1/me/appointments/:id/confirm
PATCH  /api/v1/me/appointments/:id/complete
PATCH  /api/v1/me/appointments/:id/no-show
PATCH  /api/v1/me/appointments/:id/cancel        { reason? }

# Provider autenticado — plantilla horaria
GET    /api/v1/me/schedule                        ← ver plantilla semanal actual
PUT    /api/v1/me/schedule                        ← actualizar plantilla completa
PATCH  /api/v1/me/schedule/:dayOfWeek             ← actualizar un día concreto
POST   /api/v1/me/schedule/generate               ← regenerar slots desde plantilla

# Provider autenticado — slots individuales
POST   /api/v1/me/slots                           ← crear slot manual
DELETE /api/v1/me/slots/:id                       ← eliminar slot disponible
POST   /api/v1/me/slots/block                     ← bloquear rango (vacaciones, etc.)

# Provider autenticado — configuración de servicios
GET    /api/v1/me/services/:id/config             ← ver duration + buffer
PATCH  /api/v1/me/services/:id/config             ← { durationMin, bufferAfterMin }

# Provider autenticado — CRM
GET    /api/v1/me/stats/appointments              ← estadísticas { period }
GET    /api/v1/me/customers/:id                   ← ficha completa con historial
```
