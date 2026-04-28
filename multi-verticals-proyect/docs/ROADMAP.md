# ROADMAP.md — Allcoba

> Documento vivo. Refleja el estado actual, decisiones tomadas y próximos pasos.
> El plan original detallado está en `docs/architecture/23-sprints-roadmap.md`.
> Este documento lo actualiza con los cambios decididos durante la implementación.

---

## Estado actual

```
✅ Sprint 0 — Bootstrap              [COMPLETADO 2026-04-28]
     pnpm + Turborepo, tsconfig base, @allcoba/kernel (logger, QueuePort),
     @allcoba/domain (errores, ValueObjects). 76 tests, 100% coverage.

⬜ Sprint 1 — Design Tokens          [PENDIENTE]
     tokens.json, tokens.css, tokens.dart, tailwind.config.ts

⬜ Sprint 2 — Design System          [PENDIENTE]
     Componentes base + Storybook

⬜ Sprint 3 — Base de datos          [PENDIENTE]
     PostgreSQL, migraciones, Docker Compose

⬜ Sprint 4 — CI/CD + Tooling        [PENDIENTE — NUEVO]
     GitHub Actions, ESLint, Prettier, Husky, commitlint

⬜ Sprint 5 — Scraper base           [PENDIENTE — ADELANTADO]
     ETL scraper para Dating (datos reales antes de construir features)

⬜ Sprint 6 — Auth + Cifrado         [PENDIENTE]
     JWT, KEK/DEK, MFA, sessionStore

... resto según 23-sprints-roadmap.md con ajustes abajo
```

---

## Cambios respecto al plan original

### Secuenciación

| Cambio | Razón |
|--------|-------|
| **Sprint 0 nuevo** | El plan original no tenía bootstrap. Sin `package.json` ni monorepo el proyecto no arranca. |
| **CI/Tooling temprano** | GitHub Actions + ESLint + Husky deben estar desde el día 1. Con 1 dev, CI es el revisor automático. |
| **Scraper adelantado** (de Sprint 12 → tras BD) | Sin datos reales no validas features. Poblar la BD con providers reales antes de construir UI. |
| **Flutter retrasado** (de Sprint 10 → post-MVP) | Si no hay usuarios en web, no los habrá en móvil. Validar web primero. |
| **Swipe retrasado** (de Sprint 15 → post-MVP) | Requiere masa crítica de usuarios. Con <100 providers es un Tinder vacío. |
| **Dating reemplaza Masajes** como vertical 1 | Decisión de producto. |

### Tooling

| Cambio | Razón |
|--------|-------|
| **npm → pnpm** | Más rápido, estricto, mejor soporte de monorepo. |
| **+ Turborepo** | Caché de builds/tests, ejecución paralela. Sin overhead de Nx. |
| **+ Husky + commitlint** | Pre-commit hooks para evitar commits rotos. |

### Arquitectura

| Cambio | Razón |
|--------|-------|
| **10 microservicios → modular monolith inicial** | Para 1 dev, 3-4 procesos bastan. Extraer microservicios cuando el tráfico lo justifique. |
| **Session store documentado como single-instance** | MVP corre en 1 instancia. Migrar a Redis cuando se necesite multi-instancia. |
| **Testing: vitest fetch nativo > supertest** | Una dependencia menos. Vitest ya incluye fetch para tests HTTP. |

---

## Próximo paso inmediato

**Sprint 1 — Design Tokens**

- Definir `tokens.json` (colores, tipografía, spacing, radius, shadows, motion)
- Generar `tokens.css`, `tokens.dart`, `tailwind.config.ts`
- Criterio de salida: `pnpm test` verde, tokens consumibles desde web y app

---

## Verticales MVP

1. **Dating** — Presenters publican perfil, Choosers exploran y contactan
2. **Automoción** — Concesionarios y talleres, búsqueda por ubicación

---

## Deuda técnica permitida (hasta producción)

- Session store in-memory (single instance). Migrar a Redis antes de escalar a >1 instancia.
- Lazy encryption de consumerNote en citas.
- Scraper sin gestión de CAPTCHAs (skip + log manual).
