# mundosexanuncio.com — Estructura del perfil

> Análisis sobre HTML real (fixture `antonella_99065186.html` 49KB).
> PHP SSR con JSON-LD Person estructurado.

---

## Tech

- **Render**: SSR PHP.
- **URL perfil**: `/contactos-mujeres/{slug}-{id}` — sourceId = id numérico final.
- **Listing**: `/contactos-mujeres-en-{zona}`.

---

## Identificación

| Campo       | Origen                                  | Estado |
| ----------- | --------------------------------------- | ------ |
| `sourceId`  | últimos dígitos del slug URL            | ✅     |
| `nickname`  | `section .main .title`                  | ✅     |

---

## JSON-LD Person (fuente principal)

```html
<script type="application/ld+json">
{
  "@context": "http://schema.org",
  "@type": "Person",
  "image": {
    "@type": "ImageObject",
    "url": "https://static1.mundosexanuncio.com/img_es/2345/...jpg",
    "height": "3724",
    "width": "2752"
  },
  "name": "🔴",
  "description": "🔴 Antonella 🇨🇴 Coslada Video de presentación",
  "telephone": "654587735",
  "jobTitle": "Chicas",
  "address": {
    "@type": "PostalAddress",
    "addressRegion": "Provincia Madrid",
    "addressLocality": "Madrid",
    "streetAddress": "Coslada san fernando rivas"
  }
}
</script>
```

| Campo               | Origen JSON-LD                    | Estado |
| ------------------- | --------------------------------- | ------ |
| `phone`             | `Person.telephone`                | ⚠️ no usado (preferido DOM)  |
| `description`       | `Person.description`              | ⚠️ no usado                  |
| `city` (locality)   | `Person.address.addressLocality`  | ⚠️ no usado                  |
| `region`            | `Person.address.addressRegion`    | ⚠️ no usado                  |
| `streetAddress`     | `Person.address.streetAddress`    | ⚠️ no usado                  |
| `image.url`         | `Person.image.url`                | ⚠️ no usado (fallback útil)  |

> **Gap**: el extractor actual lee solo del DOM. JSON-LD Person es **más fiable y estructurado** — debería preferirse como fuente primaria (y DOM como fallback).

---

## Contacto

```html
<div class="fa_tel">
  <a href="tel://654587735">654 587 735</a>
</div>

<!-- WhatsApp con número visible -->
<a href="https://api.whatsapp.com/send?phone=34654587735&text=Hola%2C%20me%20inte…">
  654 587 735
</a>
```

| Campo      | Selector                                                | Notas                                  | Estado |
| ---------- | ------------------------------------------------------- | -------------------------------------- | ------ |
| `phone`    | `.fa_tel a[href^="tel:"]` (href usa `tel://` doble barra) | `[href^="tel:"]` matchea ambos       | ✅     |
| `whatsapp` | `a[href*="api.whatsapp.com"]` → `?phone=` param         |                                        | ✅     |

---

## Anuncio (DOM)

```html
<section class="main">
  <h1 class="title">Antonella…</h1>
  <div class="a_content">Bio texto libre…</div>
  <div class="details" data-city="Madrid">
    <div class="addr">Coslada</div>
  </div>
</section>
```

| Campo  | Selector                            | Estado |
| ------ | ----------------------------------- | ------ |
| `bio`  | `.a_content`                        | ✅     |
| `city` | `.details[data-city]` (attr)        | ✅     |
| `addr` | `.addr` (zona texto libre)          | ✅     |
| `age`  | inferido del bio (no estructurado)  | ⚠️     |

---

## Fotos

```html
<div id="images">
  <img data-src="https://static1.mundosexanuncio.com/img_es/.../m.jpg" />
</div>
```

| Campo      | Selector                              | Estado |
| ---------- | ------------------------------------- | ------ |
| `photos[]` | `#images img[data-src]` (lazy)        | ✅     |
| Fallback   | JSON-LD `Person.image.url`            | ⚠️ no usado |

---

## Notas técnicas

- **JSON-LD Person preferible**: structured data > DOM scraping.
- **`tel://` doble barra**: el href usa `tel://654587735` (no `tel:`). El selector `[href^="tel:"]` matchea ambos formatos.
- **Emojis en `Person.name`**: el name JSON-LD viene con emoji unicode (`🔴`) sin texto. Mejor leer del DOM o `description`.
- **WebSite schema**: presente además del Person (SearchAction al buscador).
