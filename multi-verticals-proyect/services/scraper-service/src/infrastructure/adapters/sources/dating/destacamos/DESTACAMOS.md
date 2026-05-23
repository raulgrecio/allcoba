# destacamos.net — Estructura del perfil

> Análisis sobre fixture sintético `92345_elena.html` (~2KB) — extractor verificado contra mismo.
> PHP SSR. Doc basado en extractor real.

---

## Tech

- **Render**: SSR PHP.
- **URL perfil**: `/{id}-{slug}.html` — sourceId = primer segmento numérico.
- **WordPress**: No.

---

## Identificación

| Campo       | Origen                                | Estado |
| ----------- | ------------------------------------- | ------ |
| `sourceId`  | primer segmento numérico del filename | ✅     |
| `nickname`  | `h1.hh1` directo (nombre)             | ✅     |

---

## Cabecera

```html
<article>
  <h1 class="hh1">Elena</h1>
  <span class="premiumdet">Premium</span>
  <div id="description">
    <p>Bio texto libre primer párrafo…</p>
  </div>
</article>
```

| Campo       | Selector                          | Estado |
| ----------- | --------------------------------- | ------ |
| `nickname`  | `h1.hh1`                          | ✅     |
| `bio`       | `#description p:first-child`      | ✅     |
| `isPremium` | `.premiumdet` presente            | ✅     |

---

## Contacto

```html
<div id="detallesimportantes">
  <a href="tel:612345678">Llamar: 612 345 678</a>
  <a href="https://wa.me/34612345678">WhatsApp</a>
</div>
```

| Campo      | Selector                                                | Estado |
| ---------- | ------------------------------------------------------- | ------ |
| `phone`    | `#detallesimportantes a[href^="tel:"]` → strip `tel:` + non-digits | ✅ |
| `whatsapp` | `#detallesimportantes a[href*="wa.me"]` · fallback `a[href*="api.whatsapp.com"]` · `a[href*="wa.me"]` | ✅ |

---

## Datos personales (#details)

```html
<div id="details">
  <div>
    <span>Edad</span>
    <strong>26</strong>
  </div>
  <div>
    <span>Nacionalidad</span>
    <strong>Española</strong>
  </div>
  <div>
    <span>Ciudad</span>
    <strong>Madrid</strong>
  </div>
  <div>
    <span>Zona</span>
    <strong>Centro</strong>
  </div>
  <div>
    <span>Código postal</span>
    <strong>28004</strong>
  </div>
  <div>
    <span>Altura</span>
    <strong>entre 1'60 y 1'70</strong>
  </div>
  <div>
    <span>Color de pelo</span>
    <strong>Morena</strong>
  </div>
  <div>
    <span>Idiomas</span>
    <strong>Español, Inglés</strong>
  </div>
  <div>
    <span>Horario</span>
    <strong>24 horas</strong>
  </div>
</div>
```

Extractor: `extractDetailField($, 'Edad')` busca `#details > div` con `<span>` text matching, devuelve `<strong>` text.

| Label HTML      | Campo         | Notas                            | Estado |
| --------------- | ------------- | -------------------------------- | ------ |
| `Edad`          | `age`         | string ("26")                    | ✅     |
| `Nacionalidad`  | `nationality` |                                  | ✅     |
| `Ciudad`        | `city`        |                                  | ✅     |
| `Zona`          | `zone`        |                                  | ✅     |
| `Código postal` | `postalCode`  |                                  | ✅     |
| `Altura`        | `heightRaw`   | string libre ("entre 1'60 y…")   | ✅     |
| `Color de pelo` | `hairColor`   |                                  | ✅     |
| `Idiomas`       | `languages[]` | `parseDestacamosLanguages` split | ✅     |
| `Horario`       | `schedule`    |                                  | ✅     |

---

## Fotos

```html
<div id="gallery">
  <a href="https://cdn.destacamos.net/fotos/92345/1-g.jpg" class="fimage">
    <img src="https://cdn.destacamos.net/fotos/92345/1-t.jpg" alt="Elena foto 1" />
  </a>
</div>
```

| Campo            | Selector                                | Estado |
| ---------------- | --------------------------------------- | ------ |
| `photos[].src`   | `#gallery a.fimage[href]` (full-size)   | ✅     |
| `photos[].alt`   | `img[alt]` dentro del `<a>`             | ✅     |
| Notas            | thumbnail tiene `-t.jpg`, full `-g.jpg` |        |

---

## Listing

- TBD (no fixture)
- Paginación: `div.paginator a[rel="next"]`

---

## Notas técnicas

- Fixture sintético — selectores verificados con tests, no con HTML real capturado.
- 56 tests.
