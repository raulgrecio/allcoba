# CLAUDE.md — services/appointment-service

> Citas, agenda, slots de disponibilidad y CRM del Presenter.
> Puerto: 3007. Solo para verticales con features.appointments = true.

---

## Responsabilidad única

Gestionar la agenda del Presenter y las reservas del Chooser.

---

## Lo que hace

- Plantilla semanal → generación automática de slots (próximas 4 semanas)
- Reserva atómica de slots (SELECT FOR UPDATE — evita doble reserva)
- Estados de cita: pending → confirmed → completed / cancelled / no_show
- Tiempos de buffer entre citas (invisible para el Chooser)
- Cancelación automática de citas sin confirmar tras 24h
- Recordatorios: jobs programados a 24h y 2h antes
- CRM: customer_stats en claro para consultas rápidas sin descifrar
- Datos personales del cliente cifrados con DEK del Presenter

---

## Tablas en schema `appointments`

```sql
appointments.slots                -- slots de disponibilidad por provider
appointments.provider_schedule    -- plantilla semanal
appointments.service_config       -- duración + buffer por servicio
-- Tablas por provider (schema dinámico):
provider_{id}.appointments        -- citas cifradas
provider_{id}.customer_stats      -- contadores en claro
```

---

## Variables de entorno requeridas

```env
PORT=3007
DATABASE_URL=
GATEWAY_INTERNAL_URL=http://api-gateway:3000
LOG_LEVEL=info
SERVICE_NAME=appointment-service
```
