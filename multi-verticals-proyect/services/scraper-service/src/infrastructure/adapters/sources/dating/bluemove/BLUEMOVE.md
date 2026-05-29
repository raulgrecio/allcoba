# bluemove.es — Estructura del perfil

> Análisis sobre HTML real (fixture `andreia_56636.html` 307KB).
> Web component `<escort-modal>` con clases `em-*`.

---

## Tech

- **Render**: SSR perfiles · age gate JS (Playwright para discovery + age gate).
- **Web component**: `<escort-modal>` envuelve todo el perfil. Todos los selectores son `escort-modal .em-*`.
- **URL perfil**: `/{city}/escorts/#{numericId}` — sourceId = hash fragment.
- **Listing**: cards con `data-ficha-id` → `#{id}` URLs.

---

## Identificación

| Campo      | Origen                          | Estado |
| ---------- | ------------------------------- | ------ |
| `sourceId` | hash fragment de URL `#{id}`    | ✅     |
| `nickname` | `escort-modal .em-profile-name` | ✅     |

---

## Contacto

```html
<escort-modal>
  <a class="em-profile-phone" href="tel:603841323">…</a>
  <a class="em-cta-btn em-cta-call" href="tel:603841323">Llamar</a>
  <a class="em-cta-btn em-cta-whatsapp" href="https://wa.me/603841323">WhatsApp</a>
  <a class="em-cta-btn em-cta-telegram" href="https://t.me/+603841323">Telegram</a>
</escort-modal>
```

| Campo      | Selector                                                                               | Estado |
| ---------- | -------------------------------------------------------------------------------------- | ------ |
| `phone`    | `escort-modal .em-profile-phone[href^="tel:"]` · fallback `.em-cta-call[href^="tel:"]` | ✅     |
| `whatsapp` | `escort-modal .em-cta-whatsapp[href*="wa.me"]`                                         | ✅     |
| `telegram` | `escort-modal .em-cta-telegram[href*="t.me/+PHONE"]` (número, no username)             | ✅     |

---

## Bio / Highlight

```html
<div class="em-profile-quote">Linda y cariñosa</div>
<div class="em-profile-highlight">Portuguesa · 28 anos</div>
<div class="em-desc-text">Bio completa…</div>
```

| Campo       | Selector                             | Estado                         |
| ----------- | ------------------------------------ | ------------------------------ |
| `quote`     | `escort-modal .em-profile-quote`     | ✅                             |
| `highlight` | `escort-modal .em-profile-highlight` | ✅ (parsed: nationality · age) |
| `bio`       | `escort-modal .em-desc-text`         | ✅                             |

---

## Stats (datos personales)

```html
<div class="em-stat-row">
  <div class="em-stat-label">Edad</div>
  <div class="em-stat-value">28</div>
</div>
```

Extractor: `getStat($, label)` por nombre.

| Label HTML     | Notas       | Estado |
| -------------- | ----------- | ------ |
| `Edad`         | int         | ✅     |
| `Estatura`     | cm          | ✅     |
| `Peso`         | kg          | ✅     |
| `Pelo`         |             | ✅     |
| `Ojos`         |             | ✅     |
| `Nacionalidad` |             | ✅     |
| `Idiomas`      | CSV → array | ✅     |
| `Tatuajes`     |             | ✅     |
| `Pubis`        |             | ✅     |

---

## Servicios + Pagos (em-service-chip)

```html
<div class="em-service-chip" data-feature="service">Masajes</div>
<div class="em-service-chip" data-feature="payment">Efectivo</div>
```

`data-feature` clasifica chip → array `services` o `paymentMethods`.

---

## Verificación

```html
<ficha-reliability data-breakdown='{"identity_verified":true,"selfie_verified":true}'
  >…</ficha-reliability
>
<div class="elite-ficha__verified">…</div>
<div class="fv-verified">…</div>
<div class="fg-photo-verified">…</div>
```

| Campo      | Origen                                                        | Estado |
| ---------- | ------------------------------------------------------------- | ------ |
| `verified` | `escort-modal ficha-reliability[data-breakdown]` → JSON parse | ✅     |

3 clases de badge co-existen en HTML real: `elite-ficha__verified`, `fv-verified`, `fg-photo-verified`.

---

## Fotos

```html
<div class="em-photo-tile">
  <img src="https://cdn.bluemove.es/…" />
</div>
```

| Campo      | Selector                               | Estado |
| ---------- | -------------------------------------- | ------ |
| `photos[]` | `escort-modal .em-photo-tile img[src]` | ✅     |

---

## Social (instagram, etc.)

| Campo     | Selector                                       | Estado          |
| --------- | ---------------------------------------------- | --------------- |
| Instagram | `.ficha-social-media a[href*="instagram.com"]` | ✅ (attributes) |

---

## Listing (descubrimiento)

```html
<a class="elite-ficha__link" data-ficha-id="56636" href="…#56636">…</a>
```

| Campo         | Selector                        | Estado |
| ------------- | ------------------------------- | ------ |
| URLs perfiles | `[data-ficha-id]` → `#{id}` URL | ✅     |

---

## Notas técnicas

- **Web component**: todos los selectores deben prefijarse con `escort-modal` para evitar duplicados.
- **Telegram format**: `t.me/+PHONE` — number-based, no username. El extractor parsea con `parseTelegramHandle`.
- **Age gate**: Playwright requerido para listing y bypass del age gate JS.
