# Multi-Verticals Marketplace

Bienvenido al repositorio principal del marketplace multi-vertical.

> **Importante:** Todo el contexto de arquitectura, reglas de negocio y decisiones técnicas reside en `CLAUDE.md` y la carpeta `docs/`. Es de lectura obligatoria antes de aportar código.

## Configuración del Entorno de Desarrollo (IA)

Para mantener el repositorio limpio y evitar la contaminación con cientos de archivos de configuración locales, te recomendamos instalar las _skills_ de inteligencia artificial de forma **global** en tu máquina.

Abre tu terminal (WSL/Linux o macOS) y ejecuta:

```bash
# 1. Node.js y Arquitectura
npx skills add -g wshobson/agents/nodejs-backend-patterns

# 2. Bases de datos y PostgreSQL
npx skills add -g supabase/agent-skills/supabase-postgres-best-practices

# 3. Frontend web (React, Tailwind)
npx skills add -g vercel-labs/agent-skills/vercel-react-best-practices
npx skills add -g wshobson/agents/tailwind-design-system

# 4. Calidad y Testing
npx skills add -g obra/superpowers/test-driven-development
```

Una vez instaladas globalmente, cualquier agente (Cursor, Cline, Claude Code, Antigravity) que ejecutes en este proyecto heredará automáticamente el contexto de experto sobre estas tecnologías, sin necesidad de commitear carpetas ocultas al repositorio.
