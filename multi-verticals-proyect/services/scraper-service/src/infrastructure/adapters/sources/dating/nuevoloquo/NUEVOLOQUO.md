# nuevoloquo.ch / .com / .es — Estructura del perfil

> Fixture sintético `ana_67890.html`. Mismo template los 3 TLD.
> SSR parcial + age gate. Teléfono NO extraído (ofuscado, click-revealed).

---

## Tech

- **Render**: SSR + `onBeforeCapture` (cookie / age gate).
- **URL perfil**: `/escort/{province}/{slug}/{id}/` o variantes con categoría (`/masaje-erotico/{ciudad}/{slug}/{id}/`).
- **Paginación**: `a[rel="next"]`, `.page-link[aria-label="Next"]`, `a.next`.

---

## Identificación

| Campo       | Origen                                              | Estado |
| ----------- | --------------------------------------------------- | ------ |
| `sourceId`  | último segmento numérico de URL                     | ✅     |
| `nickname`  | primer token de `h2.public-title` (strip emojis)    | ✅     |

---

## Cabecera

```html
<h2 class="public-title">Ana Martínez</h2>
<!-- o -->
<h1 class="ad-name">…</h1>

<div class="card-zone">
  <div class="location">
    <a href="/escort/madrid/">Madrid</a>
  </div>
</div>

<div id="description-container">
  <p>Bio texto libre…</p>
</div>
```

| Campo          | Selector                                                                  | Estado |
| -------------- | ------------------------------------------------------------------------- | ------ |
| `title`        | `h2.public-title` · fallback `h1.ad-name`                                 | ✅     |
| `nickname`     | primer token tras strip emojis/símbolos iniciales                         | ✅     |
| `bio`          | `#description-container` text · fallback `p:first-child`                  | ✅     |
| `locationCity` | `.card-zone .location a:first` strip ` (Province)`                        | ✅     |

---

## Datos personales (.details-box)

```html
<div class="card details">
  <div class="details-box">
    <span class="legend">Edad</span><span>27</span>
  </div>
  <div class="details-box">
    <span class="legend">Género</span><span>Mujer</span>
  </div>
  <div class="details-box">
    <span class="legend">Etnia</span><span>Latina</span>
  </div>
  <div class="details-box">
    <span class="legend">Color de pelo</span><span>Morena</span>
  </div>
  <div class="details-box">
    <span class="legend">Peso</span><span>55</span>
  </div>
  <div class="details-box">
    <span class="legend">Altura</span><span>165</span>
  </div>
  <div class="details-box">
    <span class="legend">Medidas (cm)</span><span>90-60-90</span>
  </div>
  <div class="details-box">
    <span class="legend">Disponible para</span><span>Hombre</span>
  </div>
  <div class="details-box">
    <span class="legend">Idiomas</span><span>Español, Inglés</span>
  </div>
</div>
```

Extractor: `extractDetailField($, 'Edad')` busca `.details-box` con `span.legend` matching, devuelve `span:not(.legend)` text.

| Label HTML        | Campo           | Notas                              | Estado |
| ----------------- | --------------- | ---------------------------------- | ------ |
| `Edad`            | `age`           | fallback regex en bio              | ✅     |
| `Género`          | `gender`        |                                    | ✅     |
| `Etnia`           | `ethnicity`     |                                    | ✅     |
| `Color de pelo`   | `hairColor`     |                                    | ✅     |
| `Peso`            | `weightKg`      |                                    | ✅     |
| `Altura`          | `heightCm`      |                                    | ✅     |
| `Medidas (cm)`    | `measurements`  |                                    | ✅     |
| `Disponible para` | `serviceType`   | "Hombre" / "Pareja" / etc.         | ✅     |
| `Idiomas`         | `languages[]`   | CSV split                          | ✅     |

---

## Verificación / Vídeo

```html
<span class="verified-badge">verified</span>
<!-- o -->
<span class="material-symbols-outlined">verified_user</span>

<div id="galleryVideo"><video src="…"></video></div>
```

| Campo        | Selector                                                                                       | Estado |
| ------------ | ---------------------------------------------------------------------------------------------- | ------ |
| `isVerified` | `.verified-badge` · `span.material-symbols-outlined:contains("verified_user")`                 | ✅     |
| `hasVideo`   | `#galleryVideo video`                                                                          | ✅     |

---

## Fotos

```html
<div id="carousel-img">
  <div class="carousel-item active">
    <img src="https://cdn.nuevoloquo.es/fotos/ana_67890_1.jpg" />
  </div>
  <div class="carousel-item">
    <img data-src="…" />
  </div>
</div>
```

| Campo      | Selector                                                  | Estado |
| ---------- | --------------------------------------------------------- | ------ |
| `photos[]` | `#carousel-img .carousel-item img[src]` · fallback `data-src` | ✅ |

---

## ❌ No disponible

| Campo      | Razón                                                       |
| ---------- | ----------------------------------------------------------- |
| `phone`    | Ofuscado, revealed solo con Playwright click                |
| `whatsapp` | No detectado                                                |
| `services` | No estructurado                                             |
| `prices`   | No                                                          |

---

## Notas técnicas

- **Phone no extraído**: el sitio oculta el número detrás de un click + JS. Requiere Playwright para revelar (no implementado).
- **Edad fallback**: si no hay `.details-box "Edad"`, regex sobre bio `\b(1[89]|[2-5]\d)\s*años?\b`.
- **3 TLDs**: `.ch`, `.com`, `.es` — mismo HTML, mismo adapter.
- 57 tests.
