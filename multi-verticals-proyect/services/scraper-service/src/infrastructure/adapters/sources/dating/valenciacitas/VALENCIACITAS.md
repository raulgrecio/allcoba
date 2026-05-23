# valenciacitas.com — Estructura del perfil

> **Clon de madrid69.com**. Misma plataforma white-label, mismo backend
> `api-prod.valenciacitas.com`, mismo HTML Next.js.
> Adapter reutiliza extractor + mapper de [`madrid69/`](../madrid69/MADRID69.md).

---

## Tech

- **Tech**: Next.js (App Router, RSC) + Bunny Shield anti-bot.
- **Proxy**: zyte (requerido por Bunny Shield).
- **Listing**: `/` (home CSR).
- **URL perfil**: `/citas-chicas-{ciudad}-{id}-{slug}-{phone}`.
- **WordPress**: No.

---

## Diferencias vs madrid69

| Campo            | madrid69          | valenciacitas        |
| ---------------- | ----------------- | -------------------- |
| Dominio          | `madrid69.com`    | `valenciacitas.com`  |
| API backend      | `api.madrid69.com`| `api-prod.valenciacitas.com` |
| `source`         | `madrid69`        | `valenciacitas`      |
| CDN imágenes     | `madrid69.b-cdn.net/image/` | `valenciacitas.b-cdn.net/image/` (mismo patrón) |
| HTML estructura  | idéntica          | idéntica             |

---

## Implementación

```ts
class ValenciacitasPipeline extends Madrid69Pipeline {
  identifier = 'valenciacitas';
  canHandle(url) { return /valenciacitas\.com/.test(url); }
  map(payload, resolver, options) {
    return mapMadrid69(payload, resolver, { ...options, source: 'valenciacitas' });
  }
}
```

Hereda completamente de `Madrid69Pipeline`. Solo override:
- `identifier` → `valenciacitas`
- `canHandle()` → regex dominio
- `map()` → pasa `source: 'valenciacitas'` al mapper

---

## Estructura de extracción

**Idéntica a madrid69**. Ver [MADRID69.md](../madrid69/MADRID69.md) para:
- HEAD meta tags (`<title>`, `og:title`, `og:description`, `og:image`, `link rel="preload"`)
- API interception via Playwright
- Edad regex `Edad:\s*(\d{2})` en body renderizado
- Confidence dual: `medium` con API, `low` solo head

---

## Notas técnicas

- **Bunny Shield**: requiere proxy zyte para evitar bloqueo.
- **No duplica código**: cambio de portal = nuevo Pipeline subclass + dominio. El día que valenciacitas diverja del HTML de madrid69, el subclass podrá overridar `extract()`.
