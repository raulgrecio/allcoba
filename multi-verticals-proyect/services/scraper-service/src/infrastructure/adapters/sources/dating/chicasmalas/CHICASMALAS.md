# chicasmalas.es — Estructura del perfil

> Análisis sobre HTML real (fixture `sofia-deluxe.html` 689KB).
> WordPress 6.9.4 + Elementor + CPT `ficha-escort`.

---

## Tech

- **WordPress**: Sí (WP 6.9.4, Elementor, CPT `ficha-escort`).
- **Discovery**: `GET /wp-json/wp/v2/ficha-escort?per_page=N` → JSON con `link` (no scrapear listado HTML).
- **Render**: Playwright requerido. Age gate + cookies click necesario. HTML estático no tiene los widgets renderizados (Elementor JS-rendered).
- **URL perfil**: `/anuncios/{slug}/`.

---

## Identificación

| Campo       | Origen                          | Estado |
| ----------- | ------------------------------- | ------ |
| `sourceId`  | último segmento del path        | ✅     |
| `phone` URL | dígitos en slug (fallback)      | ✅     |
| `city` URL  | parseado del slug (fallback)    | ✅     |
| `nickname`  | `og:title` o `<title>` (parsed) | ✅     |

---

## Datos vía Elementor (heading + text-editor pairs)

Patrón: `<h2>Edad.</h2>` (heading widget) → siguiente widget con valor.

```html
<div class="elementor-widget-heading">
  <h2 class="elementor-heading-title">Edad.</h2>
</div>
<div class="elementor-widget-text-editor">28</div>
```

Extractor: `extractElementorFields($)` recorre `.elementor-widget-heading, .elementor-widget-text-editor` en orden, empareja label→valor. Strip `.` final del label.

| Label          | Campo         | Notas                             | Estado |
| -------------- | ------------- | --------------------------------- | ------ |
| `edad`         | `age`         | int                               | ✅     |
| `altura`       | `heightCm`    | `"1.68"` → 168 · `"168"` → 168    | ✅     |
| `descripción`  | `bio`         | (también `descripcion` sin tilde) | ✅     |
| `servicios`    | `services[]`  | split por `,·\n;`                 | ✅     |
| `idiomas`      | `languages[]` | split por `,·\n;` + `y` + `e`     | ✅     |
| `nacionalidad` | `nationality` |                                   | ✅     |
| `peso`         | `weightKg`    | int                               | ✅     |

> **Gotcha (fixture real)**: el widget heading "Servicios." existe pero su widget de valor contiene texto scrambled (`lñklbklfdklñfkhlfñkglñdfkghlñ`). El extractor produce este string como `services` → output basura. **El extractor está roto contra este fixture concreto** — pendiente reescritura cuando se obtenga un fixture con datos reales rellenados.

---

## Contacto

```html
<!-- Botón Elementor "Llamar" del perfil -->
<a class="elementor-button" href="tel:+34600111222">
  <span class="elementor-button-text">Llamar</span>
</a>

<!-- WhatsApp link en sección "publica tu anuncio" (SITE-WIDE) -->
<a href="https://wa.me/34605542092">…</a>

<!-- Telegram channel del SITE -->
<a href="https://t.me/CHICASMALASES">…</a>
```

| Campo      | Selector / origen                                                       | Notas                                                                                               | Estado |
| ---------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ |
| `phone`    | `a[href^="tel:"], a[href^="tel://"]`                                    | Soporta `tel:` y `tel://`                                                                           | ✅     |
| `whatsapp` | `a[href*="api.whatsapp.com"]` first · fallback `a[href*="wa.me"]` first | ⚠️ En fixture el `wa.me` es del SITE ("publica tu anuncio"), no del perfil → posible false positive | ⚠️     |
| Telegram   | `t.me/CHICASMALASES`                                                    | ❌ Canal del SITE, no del perfil                                                                    | ❌     |

---

## Ciudad

```html
<iframe data-src="https://maps.google.com/?q=Madrid,+Spain&…"></iframe>
```

| Campo  | Origen                                                                              | Estado |
| ------ | ----------------------------------------------------------------------------------- | ------ |
| `city` | `iframe[data-src*="maps.google.com"]` → primer token de `?q=` · fallback slug parse | ✅     |

---

## Fotos

```html
<a class="e-gallery-item" href="/wp-content/uploads/2023/10/foto.jpg">…</a>
```

Cascada de fallbacks:

1. `a.e-gallery-item[href*="/wp-content/uploads/"]` (lightbox full-size)
2. `.elementor-widget-image img` con `data-lzl-src` · `data-src` · `src` (filtrar `/wp-content/uploads/` y excluir `data:`)
3. `meta[property="og:image"]`

| Campo      | Origen         | Estado |
| ---------- | -------------- | ------ |
| `photos[]` | cascada arriba | ✅     |

---

## JSON-LD

Solo `BreadcrumbList` — sin Person/Profile útil para datos.

---

## Notas técnicas

- **Playwright obligatorio**: estático no tiene Elementor widgets — todo va por JS-render.
- **Age gate** + **cookie consent** click necesario antes de extraer.
- **`servicios` field corrupto** en fixture real (texto scrambled) — investigar qué se renderiza para perfiles activos.
- 53 tests.
