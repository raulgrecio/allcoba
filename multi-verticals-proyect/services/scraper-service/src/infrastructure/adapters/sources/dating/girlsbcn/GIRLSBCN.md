# girlsbcn.net / girlsbcn.com — Estructura del perfil

> Análisis sobre HTML real (fixture `camila105.html` 25KB).
> PHP SSR backend gbcnmedia. Comparte tipos+parsers+mapper con `girlsmadrid/`.

---

## Tech

- **Render**: SSR PHP.
- **Backend**: gbcnmedia (CDN compartido con girlsmadrid).
- **URL perfil**: `/escort/{slug}.html`.
- **Listing**: `/escorts-girl/` con paginación `a[rel="next"]`.

---

## Identificación

| Campo       | Origen                        | Estado |
| ----------- | ----------------------------- | ------ |
| `sourceId`  | basename del path sin `.html` | ✅     |
| `nickname`  | `h1` (texto plano)            | ✅     |

---

## Contacto

```html
<p class="telefono visible-phone css_escort">
  <a href="tel:663475960">663-475-960</a>
</p>
<p class="telefono hidden-phone css_escort">
  <a href="tel:663475960">663-475-960</a>
</p>
<p class="telefono css_escort">
  <a
    href="https://wa.me/34663475960?text=Hola+Camila%2C+he+visto+tu+perfil+en+GirlsBCN"
  >
    Whatsapp
  </a>
</p>
```

| Campo      | Selector                                                    | Estado |
| ---------- | ----------------------------------------------------------- | ------ |
| `phone`    | `p.telefono a[href^="tel:"], .telefono a[href^="tel:"]`     | ✅     |
| Fallback   | `p.foto.css_escort img[alt]` (dígitos)                      | ✅     |
| `whatsapp` | `a[href*="wa.me"]` → `wa.me/(\d+)` (strip `?text=…`)        | ✅     |

---

## Atributos (dl-horizontal)

```html
<dl class="dl-horizontal">
  <dt>Edad:</dt><dd>25 años</dd>
  <dt>Medidas:</dt><dd>80 - 60 - 95</dd>
  <dt>Estatura:</dt><dd>160 cm.</dd>
  <dt>Peso:</dt><dd>55 Kg.</dd>
  <dt>Cabello:</dt><dd>Negro</dd>
  <dt>Ojos:</dt><dd>Marrones</dd>
  <dt>Nacionalidad:</dt><dd>Colombiana</dd>
  <dt>Idiomas:</dt><dd></dd>
  <dt>Horarios:</dt><dd>Full time</dd>
</dl>
```

Extractor: `dlField($, 'Edad')` busca `<dt>` matching label, devuelve siguiente `<dd>`.

| Label HTML     | Campo         | Notas                  | Estado |
| -------------- | ------------- | ---------------------- | ------ |
| `Edad`         | `age`         | "25 años" → 25         | ✅     |
| `Medidas`      | `measurements`| "80 - 60 - 95"         | ✅     |
| `Estatura`     | `heightCm`    | "160 cm." → 160        | ✅     |
| `Peso`         | `weightKg`    | "55 Kg." → 55          | ✅     |
| `Cabello`      | `hairColor`   | "Negro"                | ✅     |
| `Ojos`         | `eyeColor`    | "Marrones"             | ✅     |
| `Nacionalidad` | `nationality` | "Colombiana"           | ✅     |
| `Idiomas`      | `languages[]` | flag-img titles        | ✅     |
| `Horarios`     | `schedule`    | "Full time"            | ✅     |

---

## Ciudad

```html
<p class="texto css_escort">
  …disponible en: Barcelona. Texto libre…
</p>
```

| Campo  | Selector                                                | Estado |
| ------ | ------------------------------------------------------- | ------ |
| `city` | `p.texto.css_escort` → regex `/disponible en:\s*([^.]+)/i` | ✅  |

---

## Fotos

| Campo      | Selector                                                          | Estado |
| ---------- | ----------------------------------------------------------------- | ------ |
| `photos[]` | `p.foto.css_escort img[src]` filtradas a `gbcnmedia` · `media.`   | ✅     |
| count      | hasta 50 imágenes en fixture real                                 |        |

---

## Vídeo

```html
<video class="css_escort">
  <source src="https://gbcnmedia.com/media/video/camila105_01.mp4" />
</video>
```

| Campo      | Selector                                | Estado |
| ---------- | --------------------------------------- | ------ |
| `videoUrl` | `video.css_escort source[src]`          | ✅     |

---

## Precio rango (rango 1-5)

```html
<p class="rango css_escort">
  <img alt="rango tarifa 1" src="https://css.gbcnmedia.net/girlsbcn/perfil-1.png" />
</p>
```

| Campo        | Origen                                                | Estado |
| ------------ | ----------------------------------------------------- | ------ |
| `priceRange` | `p.rango.css_escort img[src]` → regex `perfil-(\d)`   | ✅     |

---

## Notas técnicas

- **WhatsApp con texto pre-rellenado**: `?text=Hola+{name}%2C+he+visto+tu+perfil+en+GirlsBCN`.
- **Sin JSON-LD útil**.
- **Sin verified badge** detectado en fixture real.
- Comparte `girlsbcn.types.ts` + `girlsbcn.parsers.ts` + `girlsbcn.mapper.ts` con girlsmadrid (template HTML distinto).
