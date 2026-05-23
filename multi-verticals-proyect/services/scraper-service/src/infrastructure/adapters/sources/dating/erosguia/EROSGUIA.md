# erosguia.com — Estructura del perfil

> Análisis sobre HTML real (fixture `anny_55383.html` 433KB).
> Laravel + Alpine.js + Tailwind v4 (SSR). Dual panel desktop/responsive.

---

## Tech

- **Render**: SSR puro — Alpine.js no rellena nada al cargar, todo el HTML está estático.
- **URL perfil**: `/{id}.html` — ID numérico.
- **Listing**: `/escorts-{city}` · `/escorts-espana` con paginación `?pagina=N`.

---

## Dual panel (gotcha crítico)

```html
<div data-position="desktop" class="hidden">…contenido idéntico…</div>
<div data-position="responsive">…contenido idéntico…</div>
```

Dos paneles con los mismos datos. Todos los selectores **deben** ir scoped a `[data-position="responsive"]` para evitar duplicados.

> Fotos y contactos viven **fuera** de ambos paneles (`.ficha-row-img`, `.ficha-imagenes`) — no necesitan scoping.

---

## Identificación

| Campo      | Origen                         | Estado |
| ---------- | ------------------------------ | ------ |
| `sourceId` | `/{id}.html` → numérico        | ✅     |
| `nickname` | `h1.title-ad span:first-child` | ✅     |

---

## Contacto

```html
<!-- Phone in <title>: "Anny - 614 246 033 - …" -->
<title>Anny - 614 246 033 - Escorts en Madrid | Erosguia</title>

<!-- tel: link en DOM -->
<a href="tel:614246033">…</a>

<!-- WhatsApp (puede ser número distinto del call) -->
<a href="https://wa.me/34643435399?text=Hola+Anny%2C+te+he+visto+en+EROSGUIA...">WhatsApp</a>

<!-- Telegram número-based (no username) -->
<a href="https://t.me/+34643435399">Telegram</a>
```

| Campo          | Selector / origen                                  | Notas                                            | Estado |
| -------------- | -------------------------------------------------- | ------------------------------------------------ | ------ |
| `phone` (call) | `<title>` regex `- (\d{3} \d{3} \d{3}) -`          | NO desde `tel:` href                             | ✅     |
| `whatsapp`     | `a[href*="wa.me"]` (static attr)                   | **call ≠ WA** verificado: 614246033 vs 643435399 | ✅     |
| `telegram`     | `a[href^="https://t.me"]` → `+PHONE` (no username) | A `otherPlatforms[{platform:'telegram'}]`        | ✅     |

---

## Datos personales (ficha-info)

```html
<div data-position="responsive">
  <div class="ficha-info">
    <div class="grid">
      <div>
        <div class="font-semibold">Ciudad</div>
        <div>Madrid</div>
      </div>
      <div>
        <div class="font-semibold">Edad</div>
        <div>27</div>
      </div>
      <!-- … -->
    </div>
  </div>
</div>
```

Extractor: `extractFichaField($, 'Ciudad')` busca `.font-semibold` con label, devuelve sibling `div`.

| Label HTML     | Campo         | Notas                       | Estado |
| -------------- | ------------- | --------------------------- | ------ |
| `Ciudad`       | `city`        |                             | ✅     |
| `Nacionalidad` | `nationality` |                             | ✅     |
| `Edad`         | `age`         | int                         | ✅     |
| `Estatura`     | `heightCm`    | int                         | ✅     |
| `Idiomas`      | `languages[]` | CSV "Español, Inglés" split | ✅     |

---

## Bio

```html
<div data-position="responsive">
  <div class="ficha-about">
    <div x-ref="content">Bio texto libre…</div>
  </div>
</div>
```

| Campo | Selector                                                      | Estado |
| ----- | ------------------------------------------------------------- | ------ |
| `bio` | `[data-position="responsive"] .ficha-about [x-ref="content"]` | ✅     |

---

## Servicios (aficiones/hobbies — sin tarifas)

```html
<div data-position="responsive">
  <div class="ficha-services">
    <div>Servicio 1</div>
    <div>Servicio 2</div>
  </div>
</div>
```

| Campo        | Selector                                             | Estado     |
| ------------ | ---------------------------------------------------- | ---------- |
| `services[]` | `[data-position="responsive"] .ficha-services > div` | ✅ (dedup) |

---

## Fotos

```html
<!-- Cover photo (fuera de paneles) -->
<div class="ficha-row-img"><img src="https://cdn.eros.bz/cover.jpg" /></div>

<!-- Gallery (fuera de paneles) -->
<div class="ficha-imagenes">
  <div class="ficha-imagen"><img src="https://cdn.eros.bz/01.jpg" /></div>
  <!-- 6 fotos en fixture real -->
</div>
```

| Campo       | Selector                                            | Estado |
| ----------- | --------------------------------------------------- | ------ |
| cover photo | `.ficha-row-img img[src*="eros.bz"]`                | ✅     |
| `photos[]`  | `.ficha-imagenes .ficha-imagen img[src*="eros.bz"]` | ✅     |

---

## JSON-LD

Solo `WebSite` schema en page — sin Person/Profile útil.

---

## Notas técnicas

- **Phone in title**: el único lugar fiable para extraer el número de llamada. El `tel:` href existe pero el extractor prefiere el title.
- **Call ≠ WA phone**: verificado en HTML real (614246033 vs 643435399). El sitio permite registrar dos números distintos.
- **Telegram**: siempre `+PHONE` (no username). Extractor strip `+` para normalizar.
- **Languages**: parsed con `parseErosguiaLanguages` (CSV split, normalize).
- 82 tests (1 HTML fixture).
