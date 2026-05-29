# milpasiones.com — Estructura del perfil

> Fixture sintético `662583238_215990.html`. PHP custom.
> Body JS-rendered, head SSR. Todo extraído de `<head>` + URL.

---

## Tech

- **Render**: JS — body JS-rendered. `<head>` meta tags son SSR.
- **URL perfil**: `/anuncio/{phone}-{slug}_{id}/` — phone + id en path.
- **Paginación**: `?pag=N`.

---

## Identificación (desde URL)

| Campo       | Origen                                    | Estado |
| ----------- | ----------------------------------------- | ------ |
| `sourceId`  | `_(\d+)` final del path                   | ✅     |
| `phone`     | primer `\d{9,}` del path `/anuncio/`      | ✅     |
| Notas       | phone ofuscado en HTML (`668***`) — URL fuente fiable | |

---

## Datos vía `<head>`

```html
<meta property="og:title" content="Cariñosa Morbosa Muy Implicada 24horas - Estepona" />
<meta property="og:description" content="Bio texto libre del og:description…" />
<meta property="og:image" content="https://cdn.milpasiones.com/full/01.jpg" />
<meta property="og:image" content="https://cdn.milpasiones.com/full/02.jpg" />
<meta name="geo.placename" content="Estepona" />
<title>Cariñosa - milpasiones</title>
```

| Campo       | Selector                                                  | Estado |
| ----------- | --------------------------------------------------------- | ------ |
| `title`     | `meta[property="og:title"]` · fallback `<title>` split    | ✅     |
| `bio`       | `meta[property="og:description"]`                         | ✅     |
| `nickname`  | parsed del title                                          | ✅     |
| `city`      | `meta[name="geo.placename"]`                              | ✅     |
| `photos[]`  | `meta[property="og:image"]` (multiple, dedup)             | ✅     |

---

## ❌ No disponible (sin Playwright body)

| Campo      | Razón                                              |
| ---------- | -------------------------------------------------- |
| `whatsapp` | Solo en body (JS-render)                           |
| `services` | Solo en body                                       |
| `prices`   | Solo en body                                       |
| `age`      | Solo en body                                       |

> El body es JS-render, pero los datos clave (title, bio, city, photos) están en `<head>` SSR. No requiere Playwright para extracción mínima viable.

---

## Notas técnicas

- **Phone ofuscado en body**: `668***` enmascarado. URL es la única fuente fiable del número completo.
- **Multiple `og:image`**: el sitio expone todas las fotos del perfil como meta tags. Útil sin JS-render.
- 36 tests.
