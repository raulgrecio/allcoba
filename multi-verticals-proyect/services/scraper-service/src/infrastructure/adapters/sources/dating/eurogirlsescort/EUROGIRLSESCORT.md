# eurogirlsescort.com — Estructura del perfil

> Análisis sobre HTML real (fixture `sofia_1053224.html` 246KB).
> SSR Nette framework. ✅ implementado · ⚠️ presente sin mapear · ❌ no.

---

## Tech

- **Render**: SSR. PHP Nette framework. Sin `__NEXT_DATA__` ni `window.profileData`.
- **Sin Schema.org `@graph`** — extractor lee solo del DOM estructurado.
- **URL perfil**: `/escort/{slug}/{id}/?list=…` — sourceId = numérico.
- **Listing**: `/escorts/spain/…` con paginación `?profile-paginator-page=N`.

---

## Identificación

| Campo       | Origen                     | Estado |
| ----------- | -------------------------- | ------ |
| `sourceId`  | numérico del path `/{id}/` | ✅     |
| `sourceUrl` | URL canónica sin `?list=`  | ✅     |
| `nickname`  | DOM heading                | ✅     |

---

## Contacto

```html
<a class="js-phone" href="tel:+60173850646" data-phone="Al-|DQb|I_-|lXl"> +60 17 385 0646 </a>
```

| Campo                | Selector                               | Estado |
| -------------------- | -------------------------------------- | ------ |
| `phone`              | `a.js-phone[href^="tel:"]`             | ✅     |
| `encodedPhoneNumber` | `a.js-phone[data-phone]` (cifrado)     | ✅     |
| WhatsApp             | `.icon-whatsapp` → `a[href]` (sibling) | ⚠️     |
| Telegram             | ❌                                     | ❌     |

> En `sofia_1053224.html` real el `icon-whatsapp` apunta a `dmca.com` (false positive). Verificar en otros fixtures.

---

## Params block (datos personales)

```html
<div class="params">
  <div>Gender: Female</div>
  <div>Age: 30</div>
  <div>City part: <a href="…/bukit-bintang">Bukit Bintang</a></div>
  <div>Eyes: Blue</div>
  <div>Hair color: Blonde</div>
  <div>Hair lenght: Medium long</div>
  <div>Pubic hair: Trimmed</div>
  <div>Bust size: C</div>
  <div>Bust type: Natural</div>
  <div>Travel: No</div>
  <div>Weight: 55 kg / 121 lbs</div>
  <div>Height: 162 cm / 5'4''</div>
  <div>Ethnicity: Caucasian (white)</div>
  <div>Orientation: Bisexual</div>
</div>
```

Extractor: `params:` (label suffix con `:`) → callbacks por label en `EuroGirlsEscortParams`.

| Campo           | Label                   | Notas                                  | Estado |
| --------------- | ----------------------- | -------------------------------------- | ------ |
| `gender`        | `Gender:`               | normalizado a `male/female/trans`      | ✅     |
| `age`           | `Age:`                  | int                                    | ✅     |
| `cityPart`      | `City part:`            | display text                           | ✅     |
| `cityPartSlug`  | `City part:` `<a href>` | slug del href                          | ✅     |
| `eyeColor`      | `Eyes:`                 |                                        | ✅     |
| `hairColor`     | `Hair color:`           |                                        | ✅     |
| `hairLength`    | `Hair lenght:`          | sic — typo en HTML                     | ✅     |
| `pubicHair`     | `Pubic hair:`           |                                        | ✅     |
| `bustSize`      | `Bust size:`            | A/B/C/D…                               | ✅     |
| `bustType`      | `Bust type:`            | natural/silicone                       | ✅     |
| `travel`        | `Travel:`               | Yes/No                                 | ✅     |
| `weightKg`      | `Weight:`               | `55 kg / 121 lbs` → regex `(\d+)\s*kg` | ✅     |
| `heightCm`      | `Height:`               | `162 cm / 5'4''` → regex `(\d+)\s*cm`  | ✅     |
| `ethnicity`     | `Ethnicity:`            |                                        | ✅     |
| `orientation`   | `Orientation:`          |                                        | ✅     |
| `nationality`   | `Nationality:`          | si presente                            | ✅     |
| `servicesText`  | `services:`             | `.js-more .less` o texto plano         | ✅     |
| `availableFor`  | `Available for:`        | meeting partner types                  | ✅     |
| `lastLoginDate` | ej. `Last login:`       | parseado a Date                        | ✅     |

---

## Tarifas (rates table)

```html
<table class="rates">
  <tr>
    <th>Time</th>
    <th>Incall</th>
    <th>Outcall</th>
  </tr>
  <tr>
    <td>0.5 Hour</td>
    <td>600 MYR</td>
    <td>1000 MYR</td>
  </tr>
  <tr>
    <td>1 Hour</td>
    <td>1000 MYR</td>
    <td>1200 MYR</td>
  </tr>
  <!-- more durations -->
</table>
```

| Campo                    | Origen                            | Estado |
| ------------------------ | --------------------------------- | ------ |
| `rates[].duration`       | `td:nth(0)` → `parseDurationSlot` | ✅     |
| `rates[].incallAmount`   | `td:nth(1)` parse int             | ✅     |
| `rates[].outcallAmount`  | `td:nth(2)` parse int             | ✅     |
| `rates[].incallCurrency` | sufijo (MYR/EUR/GBP/AED)          | ✅     |
| Conversión EUR           | en mapper (primary + EUR)         | ✅     |

---

## Servicios

```html
<table class="services">
  <tr>
    <th>Services</th>
    <th>Included</th>
    <th>Extra</th>
  </tr>
  <tr>
    <td>69 position</td>
    <td>✓</td>
    <td></td>
  </tr>
  <tr>
    <td>Anal <span class="service-note">during the meeting</span></td>
    <td></td>
    <td>✓</td>
  </tr>
  …
</table>
```

| Campo                         | Origen                              | Estado |
| ----------------------------- | ----------------------------------- | ------ |
| `services[].name`             | `td:nth(0)` (strip `.service-note`) | ✅     |
| `services[].note`             | `.service-note` text                | ✅     |
| `services[].included`         | `td:nth(1)` no-vacío                | ✅     |
| `services[].extra`            | `td:nth(2)` no-vacío                | ✅     |
| `attributes.servicesIncluded` | filter included → names             | ✅     |
| `attributes.servicesExtra`    | filter extra → names                | ✅     |

---

## Reviews

```html
<div class="reviews">
  <div id="reviews-content">
    <div class="item">
      <span class="author">…</span>
      <span class="date">28.4.2026</span>
      <i class="full"></i>… (count of full stars 0-5)
      <p class="text">…</p>
      <span>City: …</span>
      <span>Date: 28.4.2026</span>
      <span>Duration: 1 hour</span>
    </div>
  </div>
</div>
```

| Campo                 | Origen                  | Estado |
| --------------------- | ----------------------- | ------ |
| `reviews[].author`    | `.author`               | ✅     |
| `reviews[].date`      | `.date` (raw string)    | ✅     |
| `reviews[].rating`    | count of `i.full`       | ✅     |
| `reviews[].text`      | `.text`                 | ✅     |
| `reviews[].city`      | parsed from spans       | ✅     |
| `reviews[].duration`  | parsed from spans       | ✅     |
| `reviewsRating` canon | media de `rating` (0-5) | ✅     |
| `reviewsCount` canon  | `reviews.length`        | ✅     |

---

## Mapa

```html
<div id="incall-map" data-lat="3.1506" data-lng="101.6945" data-zoom="16"></div>
```

| Campo         | Origen                            | Estado                       |
| ------------- | --------------------------------- | ---------------------------- |
| incall coords | `#incall-map[data-lat][data-lng]` | ⚠️ extraído, no en canonical |

---

## Fotos

| Campo      | Selector                        | Estado |
| ---------- | ------------------------------- | ------ |
| `photos[]` | gallery `<a>` o `<img>` por src | ✅     |

---

## Verificación

| Campo      | Selector               | Estado |
| ---------- | ---------------------- | ------ |
| `verified` | `.verified.js-tooltip` | ✅     |

---

## Notas técnicas

- **Multi-moneda**: rates en MYR/EUR/GBP/AED. Mapper duplica primary + conversión a EUR si la primaria no es EUR.
- **Sin Schema.org**: el extractor depende exclusivamente del DOM.
- **`Hair lenght`**: typo del site, no del extractor.
- 105 tests · v2 adapter completo.
