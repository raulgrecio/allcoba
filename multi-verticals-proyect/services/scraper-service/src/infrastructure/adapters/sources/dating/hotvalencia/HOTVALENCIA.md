# hotvalencia.com — Estructura del perfil

> Fixture sintético `valentina_escortvalencia.html`. WordPress + Elementor + JetEngine.
> Listing members-only. Perfiles individuales accesibles sin login.

---

## Tech

- **WordPress**: Sí. Plugins: Elementor + JetEngine (custom post types).
- **WP REST verificado 21/05/2026**: CPT de perfiles **no expuesto** en `/wp-json/wp/v2/types`. JetEngine sólo expone listing templates.
- **Listing**: **LOGIN requerido** — miembros únicamente. WP REST no viable.
- **URL perfil**: `/putas-valencia/{slug}/`.
- **Render**: SSR (perfiles), JS (listing members-only).

---

## Identificación

| Campo       | Origen                                                                  | Estado |
| ----------- | ----------------------------------------------------------------------- | ------ |
| `sourceId`  | último segmento de URL                                                  | ✅     |
| `nickname`  | primera palabra del `h1` (`.entry-title`, `.elementor-heading-title`, `h1`) | ✅ |

---

## Título / Bio

```html
<h1 class="entry-title">Valentina</h1>
<!-- o -->
<h1 class="elementor-heading-title">Valentina</h1>

<div class="elementor-text-editor">Bio texto libre…</div>
<!-- fallback -->
<div class="entry-content"><p>…</p></div>
```

| Campo   | Selector cascade                                                                                          | Estado |
| ------- | --------------------------------------------------------------------------------------------------------- | ------ |
| `title` | `h1.entry-title` · `h1.elementor-heading-title` · `h1`                                                    | ✅     |
| `bio`   | `.elementor-text-editor` · fallback `.entry-content p:first-child`                                        | ✅     |

---

## Contacto

```html
<a href="tel:+34611223344">Llamar</a>
```

| Campo      | Selector                                  | Notas                  | Estado |
| ---------- | ----------------------------------------- | ---------------------- | ------ |
| `phone`    | `a[href^="tel:"]` → strip + 9 dígitos     |                        | ✅     |
| `whatsapp` | ❌ no detectado                           |                        | ❌     |

---

## Fotos

```html
<div class="elementor-image"><img src="…" /></div>
<img class="wp-post-image" src="…" />
```

| Campo      | Selector                                              | Estado |
| ---------- | ----------------------------------------------------- | ------ |
| `photos[]` | `.elementor-image img, .wp-post-image` (`src` o `data-src`) · dedup | ✅ |
| Fallback   | `meta[property="og:image"]`                           | ✅     |

---

## Vídeo

```html
<video src="…"></video>
```

| Campo            | Selector              | Estado |
| ---------------- | --------------------- | ------ |
| `hasVideo`       | `video` element       | ✅     |
| `videoCount` stat | si `hasVideo` → 1     | ✅     |

---

## ❌ No disponible (sin login)

| Campo       | Razón                                  |
| ----------- | -------------------------------------- |
| `city`      | No extraíble sin login                 |
| `services`  | Stub                                   |
| Listing     | Members-only                           |

---

## Notas técnicas

- **Confidence**: `low` (0.5) — listing requiere login.
- **JetEngine CPT** no expuesto en REST → discovery solo vía Playwright login flow.
- 30 tests.
