# CrawlerDispatcher — Arquitectura de Navegación Unificada

## Descripción General

`CrawlerDispatcher` es el orquestador central de navegación del scraper service. Actúa como un **despachador inteligente** que elige el motor de navegación más adecuado según los requisitos de seguridad y eficiencia de cada portal, abstrayendo la complejidad al resto del sistema.

Implementa la interfaz `CrawlerPort`, garantizando que los adaptadores y casos de uso sean agnósticos a la implementación técnica subyacente.

---

## Arquitectura de Motores

El sistema utiliza una jerarquía de motores especializados:

### 1. PlaywrightCrawler (Motor Estándar)

- **Tecnología**: `playwright-core`.
- **Uso**: Sitios con protecciones básicas o de confianza.
- **Ventaja**: Ligero y rápido. Ideal para escalado masivo en sitios amigos.

### 2. PatchrightCrawler (Motor Invisible)

- **Tecnología**: `patchright` (Fork de Playwright modificado a nivel de binario).
- **Uso**: Sitios protegidos por Cloudflare Turnstile (ej. `topescortbabes.com`), DataDome o Imperva.
- **Ventaja**: Invisibilidad nativa real que evade la detección de huellas digitales (fingerprinting) sin necesidad de parches adicionales de JavaScript.

---

## Persistencia de Sesión y Contexto

### Estrategia de Perfiles Persistentes

A diferencia de crear contextos temporales, el sistema utiliza **Perfiles de Navegador Persistentes** ubicados en `__data/profiles/`.

- **Ventaja**: Mantiene cookies, `localStorage` y, sobre todo, los tokens de `cf_clearance` (Cloudflare) entre peticiones y reinicios.
- **Aislamiento**: Cada portal (o perfil solicitado) tiene su propio directorio, evitando la contaminación de cookies entre diferentes fuentes.
- **Reputación**: Al reutilizar el perfil, el navegador gana "historial", lo que reduce drásticamente la probabilidad de enfrentarse a desafíos (captchas) en visitas sucesivas.

---

## Bypass de Seguridad (Cloudflare Turnstile)

Toda la inteligencia de bypass reside en la clase base `BaseCrawler`, compartida por todos los motores. El flujo de seguridad sigue este orden:

### Paso 1: Detección Pasiva

Se analiza el contenido del DOM en busca de indicadores de Cloudflare (`challenges.cloudflare.com`, "Verify you are human", etc.).

### Paso 2: Resolución con CapSolver (Si está disponible)

Si el adaptador lo solicita y existe una `CAPSOLVER_API_KEY`, el sistema intenta resolver el desafío programáticamente.

- Se inyecta el token en el campo `cf-turnstile-response`.
- Se espera a que el sitio valide el token.

### Paso 3: Interacción Humana Automática

Si no hay solver o falla, se activa la lógica de **comportamiento humano**:

1. **Localización del Widget**: Se busca el iframe o input del desafío.
2. **Movimiento de Ratón**: Se simula un movimiento realista (no lineal) hacia el widget usando curvas de Bezier y velocidades variables.
3. **Clic Real**: Se realiza un evento de clic físico sobre el widget.
4. **Espera de Polling**: Se monitoriza el DOM hasta que el desafío desaparezca.

---

## Estrategias de Seguridad Declarativas

Los adaptadores definen su "perfil de combate" mediante `getSecurityStrategy()`:

```typescript
protected override getSecurityStrategy() {
  return {
    engine: 'patchright',        // El motor a usar
    solverStrategy: 'capsolver',    // ¿Usar pago por resolución?
    proxyStrategy: 'none',          // ¿Usar IP local o proxy?
    sessionProfile: 'mi-portal'     // Nombre del perfil persistente
  };
}
```

---

## Notas de Campo y Casos Especiales

### topescortbabes.com

Este sitio utiliza Cloudflare Turnstile en **modo estricto**.

- **Observación**: A diferencia de otros sitios donde una sesión resuelta sirve para todo el dominio, aquí el desafío se lanza URL por URL.
- **Solución**: El motor detecta el desafío de forma individual en cada `fetch()`, por lo que el `handleSecurity` se ejecuta siempre que sea necesario, garantizando la extracción.

### Persistencia en disco

Los perfiles se guardan en el sistema de archivos. Si notas que un sitio empieza a fallar sistemáticamente, borrar la carpeta correspondiente en `__data/profiles/` forzará una sesión limpia (reinicio de reputación).

---

## Variables de Entorno

| Variable                 | Descripción                     | Default |
| ------------------------ | ------------------------------- | ------- |
| `CRAWLER_MAX_CONCURRENT` | Máx. navegadores en paralelo    | `3`     |
| `CAPSOLVER_API_KEY`      | Key para resolución de captchas | —       |
| `ZYTE_API_KEY`           | Key para proxies residenciales  | —       |

---

## Caminos de Mejora (Roadmap)

1. **🟡 Corto plazo**: Guardar el User-Agent asociado a cada perfil persistente para evitar inconsistencias de fingerprinting.
2. **🔵 Medio plazo**: Implementar "Warm-up" de contexto (visitar la home antes del perfil específico).
3. **🟣 Largo plazo**: Rotación automática de proxies residenciales en caso de detección masiva de IP.
