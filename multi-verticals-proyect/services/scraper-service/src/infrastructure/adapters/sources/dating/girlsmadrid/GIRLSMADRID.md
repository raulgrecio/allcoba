# girlsmadrid.com — Estructura del perfil

> Análisis sobre HTML real (fixture `lucia167.html` 40KB).
> PHP SSR backend gbcnmedia (mismo que girlsbcn) — template HTML diferente.

---

## Tech

- **Render**: SSR PHP.
- **Backend**: gbcnmedia.net (CDN compartido con girlsbcn).
- **URL perfil**: `/{slug}.html`.
- **Ciudad**: hardcoded `'Madrid'` (no presente en HTML, único site).

---

## Identificación

| Campo       | Origen                            | Estado |
| ----------- | --------------------------------- | ------ |
| `sourceId`  | basename del path sin `.html`     | ✅     |
| `nickname`  | `.heading h1` ALL-CAPS → title case | ✅   |

---

## Contacto

```html
<p class="telefono visible-xs"><a href="tel:641351077">…</a></p>
<p class="telefono hidden-xs"><a href="tel:641351077">…</a></p>
<a href="https://wa.me/34641351077">WhatsApp</a>
```

| Campo      | Selector                              | Estado |
| ---------- | ------------------------------------- | ------ |
| `phone`    | `div.telefono a[href^="tel:"]`        | ✅     |
| `whatsapp` | `a[href*="wa.me"]`                    | ✅     |

---

## Atributos (meta-post — label+span pairs)

```html
<ul class="meta-post">
  <li><label>edad:</label><span>22 años</span></li>
  <li><label>medidas:</label> <span>85 - 60 - 95</span></li>
  <li><label>estatura:</label><span>172 cm.</span></li>
  <li><label>peso:</label><span>58 Kg.</span></li>
  <li><label>cabello:</label><span>Negro</span></li>
  <li><label>ojos:</label><span>Marrones</span></li>
  <li><label>nacionalidad:</label><span>Española</span></li>
  <li><label>idiomas:</label><span><img title="Español" /><img title="Inglés" /></span></li>
</ul>
```

Extractor: `extractMetaField($, 'edad')` busca `<li>` con `<label>` matching (strip `:`), devuelve `<span>` text.

| Label        | Campo         | Notas                            | Estado |
| ------------ | ------------- | -------------------------------- | ------ |
| `edad`       | `age`         | "22 años" → 22                   | ✅     |
| `medidas`    | `measurements`|                                  | ✅     |
| `estatura`   | `heightCm`    | "172 cm." → 172                  | ✅     |
| `peso`       | `weightKg`    | "58 Kg." → 58                    | ✅     |
| `cabello`    | `hairColor`   | "Negro"                          | ✅     |
| `ojos`       | `eyeColor`    | "Marrones"                       | ✅     |
| `nacionalidad`| `nationality`| "Española"                       | ✅     |
| `idiomas`    | `languages[]` | `<img title="…">` titles → array | ✅     |

---

## Bio

```html
<div class="folio-detail">
  <div class="widget">
    <h4>mi presentación</h4>
    <p>Hola. Me llamo Lucia, soy una estudiante…</p>
  </div>
</div>
```

| Campo | Origen                                              | Estado |
| ----- | --------------------------------------------------- | ------ |
| `bio` | `.folio-detail .widget h4:contains("presentaci") + p` | ✅   |

---

## Agenda / Horarios (widget separado — GAP)

```html
<div class="widget">
  <h4>mi agenda</h4>
  <ul>
    <li>agenda: Disponible</li>
    <li>horarios: De 8h a 23h</li>
  </ul>
</div>
```

> **Gap**: el extractor busca `horarios` en `ul.meta-post`. Pero en HTML real "horarios" está en widget separado "mi agenda" con formato `"label: value"` combinado. **No extraídos actualmente** — implementar fallback al widget "mi agenda".

| Campo      | Origen                                             | Estado |
| ---------- | -------------------------------------------------- | ------ |
| `schedule` | widget "mi agenda" → `<li>` "horarios: De 8h a 23h" | ❌    |
| `agenda`   | widget "mi agenda" → `<li>` "agenda: Disponible"   | ❌     |

---

## Encuentros (meetingPlaces)

```html
<div class="widget">
  <ul class="tags">
    <li>En tu casa</li>
    <li>Hoteles</li>
    <li>Veladas</li>
    <li>Viajes</li>
  </ul>
</div>
```

| Campo            | Selector                  | Estado |
| ---------------- | ------------------------- | ------ |
| `meetingPlaces[]`| `.widget .tags li`         | ✅     |

---

## Fotos

```html
<div class="foto media-box">
  <div class="media-box-image">
    <img src="https://media.gbcnmedia.net/lucia167/021.jpg" />
  </div>
</div>
```

| Campo      | Selector                                                              | Estado |
| ---------- | --------------------------------------------------------------------- | ------ |
| `photos[]` | `.foto.media-box .media-box-image img[src]` (19 imgs en fixture real) | ✅     |
| Notas      | el extractor mira `data-src` primero, luego `src` — fixture usa solo `src` | ✅ |

---

## Precio rango

```html
<div class="widget">
  <h4>mis tarifas</h4>
  <img src=".../perfil-4.png" alt="tarifas 4" />
</div>
```

| Campo        | Origen                                                | Estado |
| ------------ | ----------------------------------------------------- | ------ |
| `priceRange` | `.widget h4:contains("tarifas") ~ img` → `perfil-(\d)` | ✅    |

---

## Notas técnicas

- **Ciudad hardcoded**: `'Madrid'` — no se extrae del HTML.
- **ALL-CAPS title**: el extractor convierte a title-case.
- **Comparte tipos/parsers/mapper con girlsbcn**: solo el extractor es propio (template HTML diferente).
- **Gap pendiente**: widget "mi agenda" no extraído (agenda + horarios).
