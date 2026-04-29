# DECISIONS.md — Allcoba

> Registro de decisiones de arquitectura y producto.
> Las decisiones aceptadas son vinculantes. Las propuestas están en discusión.
> Formato: [ADR simplificado](https://adr.github.io/) — fecha, contexto, decisión, consecuencias.

---

## Decisiones aceptadas

### D-001: pnpm + Turborepo como gestor de monorepo

**Fecha:** 2026-04-28
**Contexto:** El plan original usaba npm workspaces. pnpm es más rápido, tiene mejor resolución de dependencias, y Turborepo añade caché de builds/tests sin complejidad.
**Decisión:** pnpm workspaces + Turborepo.
**Consecuencias:**
- `pnpm-workspace.yaml` en raíz
- Comandos: `pnpm --filter <pkg> <script>` o `turbo <task>`
- package.json raíz con `"packageManager": "pnpm@10.32.1"`

---

### D-002: Verticales MVP: Dating + Automoción

**Fecha:** 2026-04-28
**Contexto:** El plan original alternaba entre "Dating + Masajes" (CLAUDE.md, README) y "Masajes + Automoción" (sprints roadmap). Inconsistencia resuelta.
**Decisión:** Dating + Automoción como verticales iniciales.
**Consecuencias:**
- Sprint 6-7 pasan de "Masajes" a "Dating"
- Sprint 14 (Citas — Masajes) requiere rediseño: un sistema de citas no aplica a Dating
- Screen map (27-screen-map.md) necesita revisión de las secciones de Masajes

---

### D-003: Modular monolith inicial, no 10 microservicios

**Fecha:** 2026-04-28
**Contexto:** El plan original define 10 microservicios independientes. Para 1 desarrollador, mantener 10 servicios, 10 Dockerfiles y 10 pipelines de CI es overhead innecesario en MVP.
**Decisión:** Comenzar con 3-4 procesos (gateway+auth, core, workers). Extraer microservicios cuando el tráfico o el equipo lo justifiquen.
**Consecuencias:**
- Menos ficheros de configuración inicial
- La arquitectura hexagonal se mantiene (los boundaries existen en código)
- Migrar a microservicios = mover módulos a procesos separados, no reescribir

---

### D-004: Scraper adelantado a fase temprana

**Fecha:** 2026-04-28
**Contexto:** El plan original ponía el scraper en Sprints 12-13 (Fase 3). Sin datos reales, las features de búsqueda y perfiles se desarrollan a ciegas.
**Decisión:** Scraper base inmediatamente después de tener BD (Sprint 5).
**Consecuencias:**
- Validar la BD con datos reales desde el principio
- Las features de búsqueda se prueban con datos reales, no seeds artificiales

---

### D-005: Flutter app retrasada a post-MVP

**Fecha:** 2026-04-28
**Contexto:** El plan original ponía la app móvil en Sprints 10-13 (Fase 3), antes de validar la web.
**Decisión:** Retrasar Flutter hasta que la web tenga tracción.
**Consecuencias:**
- Foco total en web + backend durante Fases 0-3
- El móvil se retoma si hay métricas que lo justifiquen (tráfico mobile > 30%)

---

### D-006: CI/CD + Tooling como sprint propio temprano

**Fecha:** 2026-04-28
**Contexto:** El plan original no dedicaba ningún sprint a CI/CD ni tooling. GitHub Actions aparecía en el stack pero sin plan de implementación.
**Decisión:** Sprint específico para CI/tooling justo después de tener BD (Sprint 4).
**Contenido del sprint:**
- GitHub Actions: test + lint + typecheck en cada PR
- ESLint + Prettier configurados
- Husky + commitlint para pre-commit hooks
- Vitest config base compartida

---

## Propuestas (en discusión)

### P-001: ¿Typesense o PostgreSQL FTS?

**Contexto:** El plan menciona Typesense como alternativa futura al full-text search de PostgreSQL. PostgreSQL tsvector funciona bien hasta ~100K registros.
**Estado:** Diferir hasta que PostgreSQL FTS muestre problemas de rendimiento.

### P-002: ¿Redis o in-memory session store?

**Contexto:** El plan actual usa Map con TTL para session store (DEK). Esto limita a single-instance.
**Estado:** Aceptado para MVP. Migrar a Redis cuando se necesite >1 instancia.

### P-003: ¿Cuándo extraer el primer microservicio?

**Contexto:** D-003 decide modular monolith inicial. Falta definir el trigger para extraer.
**Propuesta:** Extraer cuando un módulo:
- Tenga necesidades de escalado distintas al resto (>2x tráfico)
- Requiera un lenguaje o runtime diferente
- Tenga un ciclo de deploy independiente (ej: scraper)

---

## Cosas a revisitar

- [ ] Screen map (27-screen-map.md): secciones de Masajes necesitan ser rediseñadas para Dating
- [ ] Sprint 14 (Citas): no aplica a Dating. ¿Rediseñar para Automoción o eliminar?
- [ ] 28 docs de arquitectura: replantear cuáles son necesarios antes de escribir código
- [ ] .agents/skills: mover a docs/skills cuando haya código real que los use
- [ ] Posible salida de Vercel: documentar alternativas (Cloudflare Pages, Railway, Hetzner)
- [ ] CLAUDE.md por servicio: evaluar consolidar en un solo archivo con secciones
