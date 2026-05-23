# citapasion.com — Estructura del perfil

> Análisis sobre HTML real (fixture `sofia_17533.html`).
> PHP + Slick slider. SSR perfiles · listing AJAX.

---

## Tech

- **Render**: SSR para perfiles. Listing es AJAX → Playwright para discovery.
- **URL perfil**: `/escorts/{numericId}` — sourceId = ID numérico.
- **Listing**: `/escorts/{province}/{city}` (AJAX, no scrapeable como HTML estático).
- **WordPress**: No.

---

## Identificación

| Campo       | Origen                            | Estado |
| ----------- | --------------------------------- | ------ |
| `sourceId`  | numérico del path                 | ✅     |
| `nickname`  | `<h1>` split por `|` · fallback `<title>` · fallback `datos_interes "Nombre"` | ✅ |

---

## Contacto

```html
<!-- Phone: AJAX-revealed (data-href) cuando se hace click; tel: presente como fallback estático -->
<a data-href="tel:+34644556677">Mostrar teléfono</a>
<a href="tel:+34644556677">…</a>

<!-- WhatsApp: data-accion o href -->
<button data-accion="https://wa.me/34644556677">WhatsApp</button>
<a href="https://wa.me/34644556677">…</a>
```

| Campo      | Selector                                                                    | Estado |
| ---------- | --------------------------------------------------------------------------- | ------ |
| `phone`    | `[data-href^="tel:"]` (AJAX) · fallback `a[href^="tel:"]`                   | ✅     |
| `whatsapp` | `[data-accion*="wa.me"]` · fallback `a[href*="wa.me"]` (sin `+` prefix)     | ✅     |

---

## Bio

```html
<div class="card-perfil sobre__mi">
  <div class="text__description">Bio texto libre…</div>
</div>
```

| Campo | Selector                                              | Estado |
| ----- | ----------------------------------------------------- | ------ |
| `bio` | `.card-perfil.sobre__mi .text__description`           | ✅     |

---

## Datos personales (datos_interes)

```html
<div class="card-perfil datos_interes">
  <ul>
    <li><span>Edad:</span> 25</li>
    <li><span>Altura:</span> 165 cm</li>
    <li><span>Peso:</span> 55 kg</li>
    <li><span>Color de pelo:</span> Castaño</li>
    <li><span>Tipo de pelo:</span> Largo</li>
    <li><span>Color de ojos:</span> Marrones</li>
    <li><span>Etnia:</span> Latina</li>
    <li><span>Nacionalidad:</span> Colombiana</li>
    <li><span>Tatuajes:</span> Sí</li>
    <li><span>Piercings:</span> No</li>
    <li><span>Fumador@:</span> No</li>
    <li><span>Ciudad:</span> Madrid</li>
    <li><span>Zona:</span> Centro</li>
  </ul>
  <div class="idiomas__content">
    <div class="item"><p>Español</p></div>
    <div class="item"><p>Inglés</p></div>
  </div>
</div>
```

Extractor: `extractDataRow($, 'Edad')` busca `<li>` con `<span>` matching, devuelve texto restante.

| Label HTML       | Campo         | Notas                | Estado |
| ---------------- | ------------- | -------------------- | ------ |
| `Edad`           | `age`         | parseFirstInt        | ✅     |
| `Altura`         | `heightCm`    | parseFirstInt        | ✅     |
| `Peso`           | `weightKg`    | parseFirstInt        | ✅     |
| `Color de pelo`  | `hairColor`   |                      | ✅     |
| `Tipo de pelo`   | `hairLength`  |                      | ✅     |
| `Color de ojos`  | `eyeColor`    |                      | ✅     |
| `Etnia`          | `ethnicity`   |                      | ✅     |
| `Nacionalidad`   | `nationality` |                      | ✅     |
| `Tatuajes`       | `tattoos`     | bool (Sí/No)         | ✅     |
| `Piercings`      | `piercings`   | bool                 | ✅     |
| `Fumador@`       | `smoker`      | bool (sic — @)       | ✅     |
| `Ciudad`         | `city`        |                      | ✅     |
| `Zona`           | `zone`        |                      | ✅     |
| `languages`      | `.idiomas__content .item p` array | ✅      |

---

## Rating y Reviews

```html
<div class="reviews">
  <div class="stars" style="--rating: 4.5;"></div>
  <span>(12)</span>
</div>
```

| Campo                | Selector                                          | Estado |
| -------------------- | ------------------------------------------------- | ------ |
| `siteRating.score`   | `.reviews .stars[style]` → CSS var `--rating: X`  | ✅     |
| `siteRating.count`   | `.reviews span` text → regex `\((\d+)\)`          | ✅     |

> **Sin JSON-LD** en fixture real. El rating viene solo del DOM (CSS variable).

---

## Fotos

```html
<div class="slider-fichas">
  <a data-fslightbox="gallery" href="https://cdn.citapasion.com/full/01.jpg">
    <img src="https://cdn.citapasion.com/thumb/01.jpg" />
  </a>
</div>
```

| Campo      | Selector                                              | Estado |
| ---------- | ----------------------------------------------------- | ------ |
| `photos[]` | `.slider-fichas a[data-fslightbox="gallery"][href]`   | ✅     |
| Fallback   | `meta[property="og:image"]`                           | ✅     |

---

## ❌ No disponible

| Campo      | Razón                                                       |
| ---------- | ----------------------------------------------------------- |
| `prices`   | No expuesto en HTML estático                                |
| `services` | No expuesto en HTML estático                                |

---

## Notas técnicas

- **AJAX phone**: el `data-href` se revela al click. El extractor lo lee directo del DOM estático.
- **WhatsApp prefix**: `wa.me/34…` sin `+` en URL.
- **Rating CSS var**: técnica inusual — el sitio rellena estrellas con `--rating: X.X` y CSS calc. Extractor parsea la regla style inline.
- **Sin JSON-LD `aggregateRating`**: a pesar de tener rating numérico, no hay schema.org en fixture real.
