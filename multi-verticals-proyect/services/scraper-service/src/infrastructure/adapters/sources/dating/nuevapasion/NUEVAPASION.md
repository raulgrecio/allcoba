# nuevapasion.com — Estructura del perfil

> Fixture sintético `sofia_abc123.html`. Bootstrap 5 + PHP.
> Age gate `#edadPopup` bloquea contenido — Playwright requerido.

---

## Tech

- **Render**: JS — age gate `#edadPopup` bloquea contenido.
- **URL perfil**: `/anuncio/{slug}`.
- **Paginación**: `a[rel="next"]`.
- **Age gate**: `onBeforeCapture` → `#edadPopup button.btn-primary`.
- **Cookie**: `#cookieButton` flotante, `#cookieModal` con acordeón.

---

## Identificación

| Campo       | Origen                                    | Estado |
| ----------- | ----------------------------------------- | ------ |
| `sourceId`  | último segmento del path                  | ✅     |
| `nickname`  | parsed del título (primera palabra)       | ✅     |

---

## Título / Bio

```html
<h1>Sofia, escort independiente</h1>
<!-- fallbacks -->
<div class="ad-title">…</div>
<div class="titulo-anuncio">…</div>

<div class="descripcion">Bio texto libre…</div>
<!-- fallbacks -->
<div class="anuncio-body">…</div>
<div class="ad-description">…</div>
```

| Campo   | Selector cascade                                                            | Estado |
| ------- | --------------------------------------------------------------------------- | ------ |
| `title` | `h1` · `.ad-title` · `.titulo-anuncio`                                      | ✅     |
| `bio`   | `.descripcion` · `.anuncio-body` · `.ad-description`                        | ✅     |

---

## Contacto

```html
<a href="tel:+34655123456">Llamar</a>
<a href="https://wa.me/34655123456">WhatsApp</a>
```

| Campo      | Selector                                                                              | Estado |
| ---------- | ------------------------------------------------------------------------------------- | ------ |
| `phone`    | `a[href^="tel:"]` → `parseNuevapasionPhone` (9 dígitos)                               | ✅     |
| `whatsapp` | `a[href*="wa.me"], a[href*="whatsapp"]` → regex `\d{9,}` → `parseNuevapasionPhone`    | ✅     |

---

## Fotos

```html
<div class="gallery"><img src="…" data-src="…" data-lazy="…" /></div>
<!-- o -->
<div class="foto"><img /></div>
<!-- o swiper -->
<div class="swiper-slide"><img /></div>
```

Cascade: `data-src` → `data-lazy` → `src`.

| Campo      | Selector                                                            | Estado |
| ---------- | ------------------------------------------------------------------- | ------ |
| `photos[]` | `.gallery img, .foto img, .swiper-slide img` (lazy cascade)         | ✅     |
| Fallback   | `meta[property="og:image"]`                                         | ✅     |

---

## ❌ No disponible

| Campo      | Razón                  |
| ---------- | ---------------------- |
| `services` | Stub                   |
| `prices`   | Stub                   |
| `city`     | No estructurado        |

---

## Notas técnicas

- **Age gate obligatorio**: `#edadPopup button.btn-primary` click antes de extraer.
- **Cookie modal**: `#cookieButton` flotante o `#cookieModal` con acordeón.
- 33 tests.
