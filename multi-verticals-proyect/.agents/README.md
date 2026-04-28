# Allcoba — Agent Skills

Skills compartidas entre todos los agentes de IA (Claude, Qwen, Gemini) que trabajan en este proyecto.
Garantizan que el código generado sea consistente independientemente del agente que lo escriba.

---

## Cómo usar estas skills

Antes de generar código, el agente debe leer la skill relevante para la tarea.
Incluir el contenido de la skill en el prompt del agente.

### Skills disponibles

| Skill | Ruta | Cuándo leerla |
|-------|------|--------------|
| TypeScript | `typescript/SKILL.md` | Antes de escribir cualquier fichero `.ts` |
| Hexagonal Architecture | `hexagonal-architecture/SKILL.md` | Antes de crear entidades, use cases, ports o adapters |
| Fastify | `fastify/SKILL.md` | Antes de escribir routes, plugins o middleware |
| Drizzle | `drizzle/SKILL.md` | Antes de definir schemas, queries o migrations |
| Testing | `testing/SKILL.md` | Antes de escribir cualquier test |
| Security | `security/SKILL.md` | Antes de tocar auth, cifrado o datos de usuarios |
| Microservices | `microservices/SKILL.md` | Antes de escribir comunicación entre servicios o jobs |

### Ejemplo de prompt con skill

```
Lee las siguientes skills antes de generar código:

[CONTENIDO DE typescript/SKILL.md]
[CONTENIDO DE hexagonal-architecture/SKILL.md]

TAREA: Crea la entidad User en services/auth-service/src/domain/entities/user.entity.ts
...
```

---

## Principio de consistencia

El código generado por Qwen, Gemini y Claude debe ser indistinguible.
Si un agente genera código que no sigue estas skills, el código debe ser rechazado
y el agente debe regenerarlo con el contexto correcto.
