# mislios.com — Estructura del perfil

> Fixture sintético `ana_escort-madrid.html`. WordPress + plugin custom "mislios".
> Listing AJAX → Playwright para discovery. Perfiles individuales SSR.

---

## Tech

- **WordPress**: Sí (`/wp-content/` detectado 20/05/2026).
- **WP REST verificado 21/05/2026**: CPT `anuncios` **no expuesto** en `/wp-json/wp/v2/`. Discovery vía Playwright + networkidle (listing AJAX).
- **Render**: SSR para perfiles. Listing AJAX.
- **URL perfil**: `/escorts/{ciudad}/{slug}-{id}/` — último segmento es sourceId.
- **País**: ES exclusivamente.

---

## Identificación

| Campo       | Origen                                          | Estado |
| ----------- | ----------------------------------------------- | ------ |
| `sourceId`  | último segmento del path                        | ✅     |
| `nickname`  | parsed del `h1` o `.msl-profile-name`           | ✅     |

---

## Título / Bio

```html
<h1>Ana escort Madrid</h1>
<!-- o -->
<div class="msl-profile-name">Ana</div>

<div class="msl-profile-desc">Bio texto libre…</div>
<!-- o fallback -->
<div class="profile-text">…</div>
```

| Campo   | Selector cascade                                                 | Estado |
| ------- | ---------------------------------------------------------------- | ------ |
| `title` | `h1` · fallback `.msl-profile-name`                              | ✅     |
| `bio`   | `.msl-profile-desc` · fallback `.profile-text`                   | ✅     |

---

## Contacto

```html
<a href="tel:+34622345678">Llamar</a>
```

| Campo      | Selector                                              | Estado |
| ---------- | ----------------------------------------------------- | ------ |
| `phone`    | `a[href^="tel:"]` → `parseMisliosPhone` (9 dígitos)   | ✅     |
| `whatsapp` | ❌ no detectado                                       | ❌     |

---

## Fotos

```html
<div class="msl-gallery">
  <img src="…" data-src="…" />
</div>
```

| Campo      | Selector                                              | Estado |
| ---------- | ----------------------------------------------------- | ------ |
| `photos[]` | `.msl-gallery img` (`src` o `data-src`) · dedup       | ✅     |
| Fallback   | `meta[property="og:image"]`                           | ✅     |

---

## ❌ No disponible (HTML estático)

| Campo      | Razón                                              |
| ---------- | -------------------------------------------------- |
| `city`     | No en HTML estático (Edad/Nacionalidad tampoco)    |
| `services` | No                                                 |
| `prices`   | No                                                 |
| `whatsapp` | No detectado                                       |

---

## Notas técnicas

- **Listing AJAX**: Playwright networkidle requerido para discovery.
- Edad / Nacionalidad / Ciudad no en HTML estático de perfil.
- Adapter v2 con tests parsers.
