# escort-advisor.xxx — Estructura del perfil de anuncio

> Documento de descubrimiento progresivo. Analizado con fixture `667554247` (Diana, Madrid).
> Los campos marcados ✅ están implementados, ⚠️ se presumen pero sin fixture adicional, ❌ no encontrados.

---

## Identificación del perfil

| Campo       | HTML / selector                         | Valor ejemplo                          | Estado |
| ----------- | --------------------------------------- | -------------------------------------- | ------ |
| `sourceId`  | Último segmento de `/escorts/.../slug/` | `667554247`                            | ✅     |
| `sourceUrl` | URL completa de la página               | `https://escort-advisor.xxx/escorts/…` | ✅     |

---

## Cabecera

```html
<div class="username"><h2>Diana</h2></div>
<div class="data-container"><div class="content">Bio texto libre…</div></div>
<span class="icon-ok-circled"></span>
<!-- badge verificada -->
```

| Campo        | Selector                   | Notas                        | Estado |
| ------------ | -------------------------- | ---------------------------- | ------ |
| `nickname`   | `.username h2`             | Nombre visible del perfil    | ✅     |
| `bio`        | `.data-container .content` | Texto libre, puede ser largo | ✅     |
| `isVerified` | `.icon-ok-circled`         | `.verified-badge` NO existe  | ✅     |

---

## Teléfono / Contacto

```html
<!-- Botón "llamar" — tel: href contiene el teléfono real -->
<a href="tel:+34667554247" onclick="CallMeClick(667554247, 'Profile')">
  <i class="icon-phone"></i> Llame
</a>

<!-- data-number = ID del perfil (NO el teléfono) — no usar como fuente de phone -->
<div class="toogleReview" data-number="667554247">…</div>

<!-- WhatsApp — mismo número en el onclick -->
<div
  class="btn btn-whatsapp"
  onclick="whatsApp(+34667554247, 'Diana', 'es', 667554247, 'Profile', 1)"
>
  <i class="icon-whatsapp"></i>
</div>
```

> `a[href^="tel:"]` SÍ existe en el HTML real. El fallback `data-number` es un ID de anuncio
> (no teléfono) — solo se activa si el `tel:` link falta, lo cual no ocurre en perfiles normales.

| Campo      | Selector / origen                                   | Notas                           | Estado |
| ---------- | --------------------------------------------------- | ------------------------------- | ------ |
| `phone`    | `a[href^="tel:"]` → `parseEscortAdvisorPhone`       | E.164 normalizado               | ✅     |
| `whatsapp` | `[onclick*="whatsApp"]` → regex `whatsApp\((\+\d+)` | Incluye prefijo país (`+34...`) | ✅     |
| Telegram   | ❌ No visto                                         | —                               | ❌     |

---

## personal-info — Información estructurada

```html
<div class="personal-info">
  <ul class="info-list">
    <li><b>Ciudad:&nbsp;</b>Madrid&nbsp;(M)</li>
    <li><b>Categoría:&nbsp;</b>Escort</li>
    <li><b>Edad:&nbsp;</b>25-36&nbsp;años</li>
    <li><b>Precio:&nbsp;</b>€€€€&nbsp; de 201 y 500 euro</li>
    <li><b>Nacionalidad:&nbsp;</b>España</li>
    <li><b>Recibo:&nbsp;</b> A mi casa&nbsp;Hotel/Motel&nbsp;En la casa del cliente</li>
    <li><b>Altura:&nbsp;</b>165-180 cm (5'5"-5'10")</li>
    <li><b>Figura:&nbsp;</b>Atlética</li>
    <li><b>Ojos:&nbsp;</b>Marrones</li>
    <li><b>Cabellos:&nbsp;</b>Oscuro largo</li>
    <li><b>Seno:&nbsp;</b>Grande, perfecto, no operado</li>
    <li><b>Pubis:&nbsp;</b>Rapado</li>
    <li><b>Culo:&nbsp;</b>Hermoso redondo</li>
    <li><b>Fuma:&nbsp;</b>No</li>
    <li><b>Tatuajes:&nbsp;</b>Uno</li>
    <li><b>Piercing:&nbsp;</b>Alguno</li>
  </ul>
</div>
```

Todos los campos se extraen con `getPersonalInfoField($, 'Label')` — busca `<b>Label` en `.personal-info .info-list li` y devuelve el texto tras `:`.

| Campo         | Label en HTML   | Valor ejemplo                     | Estado |
| ------------- | --------------- | --------------------------------- | ------ |
| `city`        | `Ciudad:`       | `"Madrid (M)"` → strip `(M)`      | ✅     |
| `category`    | `Categoría:`    | `"Escort"`, `"Trans"`, etc.       | ⚠️     |
| `age`         | `Edad:`         | `"25-36 años"` → primer int (25)  | ✅     |
| `priceText`   | `Precio:`       | `"€€€€ de 201 y 500 euro"`        | ✅     |
| `nationality` | `Nacionalidad:` | `"España"`                        | ✅     |
| `meetingRaw`  | `Recibo:`       | texto libre multi-valor           | ✅     |
| `heightCm`    | `Altura:`       | `"165-180 cm"` → primer int (165) | ✅     |
| `bodyType`    | `Figura:`       | `"Atlética"`                      | ✅     |
| `eyeColor`    | `Ojos:`         | `"Marrones"`                      | ✅     |
| `hairColor`   | `Cabellos:`     | `"Oscuro largo"`                  | ✅     |
| `breastInfo`  | `Seno:`         | texto libre                       | ⚠️     |
| `pubic`       | `Pubis:`        | `"Rapado"`                        | ⚠️     |
| `weightKg`    | `Peso:`         | No visto en este fixture          | ⚠️     |
| `ethnicity`   | `Etnia:`        | No visto en este fixture          | ⚠️     |

---

## Servicios / Gustos personales

```html
<div class="preferences">
  <ul class="info-list">
    <li>Relaciones sexuales</li>
    <li>Griego</li>
    <li>Oral sin (BBJ)</li>
    <li>Masaje Profesional</li>
    <li>Masaje Tántrico</li>
    <li>Masaje de próstata</li>
    <li>Masaje sensual cuerpo a cuerpo</li>
    <li>Besos ligeros</li>
    <li>Besos profundos (FK)</li>
    <li>Experiencia de novia (GFE)</li>
    <li>Oral con</li>
    <li>Terminar en boca (CIM)</li>
    <li>Terminar en los senos (COB)</li>
    <li>Orgasmo múltiple</li>
    <li>Porn Star Experiencia (PSE)</li>
    <li>Sexo oral (DATY)</li>
    <li>69</li>
    <li>Masturbación con la mano (HJ)</li>
  </ul>
</div>
```

| Campo      | Selector                     | Notas                        | Estado |
| ---------- | ---------------------------- | ---------------------------- | ------ |
| `services` | `.preferences .info-list li` | Flat string[], texto español | ✅     |

---

## Fotos

```html
<div class="gallery_tray">
  <img src="https://ci.cdn.group/v1/.../thumb/201x268/i.jpg" />
  …
</div>
<img class="user_image" … />
<img class="banner_image" … />
<meta property="og:image" content="…" />
```

| Campo       | Selector                                        | Notas                | Estado |
| ----------- | ----------------------------------------------- | -------------------- | ------ |
| `photos`    | `.gallery_tray img, .user_image, .banner_image` | Deduplicados por src | ✅     |
| OG fallback | `meta[property="og:image"]`                     | Si galería vacía     | ✅     |

---

## Reviews / Valoraciones

```html
<div class="pdp_rating_component">
  <div class="tx" style="color: #f00f88; font-weight: 700">4,86</div>
  <div class="rating"><i class="icon-ea-stars s_full"></i>…</div>
</div>

<div class="reviews_resume_2025">Ubicación: nº 2 de 6500</div>

<!-- Cada review individual -->
<div class="col-xs-12 review when-closed" data-uid="8450211895">…</div>
```

| Campo           | Selector / origen                         | Notas                             | Estado |
| --------------- | ----------------------------------------- | --------------------------------- | ------ |
| `reviewsRating` | `.pdp_rating_component .tx` → parse float | Coma decimal → `"4,86"` → `4.86`  | ✅     |
| `reviewsCount`  | `.review.when-closed` → count             | N divs en HTML (puede ser subset) | ✅     |
| `ranking`       | `.reviews_resume_2025` → regex `nº (\d+)` | "nº 2 de 6500"                    | ⚠️     |

---

## Meeting places (inferido de "Recibo:")

| Valor en HTML            | Incall | Outcall |
| ------------------------ | ------ | ------- |
| `A mi casa`              | ✓      | —       |
| `Hotel/Motel`            | —      | ✓       |
| `En la casa del cliente` | —      | ✓       |

Regex: `incall = /mi casa|piso|local|estudio/i`, `outcall = /hotel|motel|cliente|domicilio/i`

---

## Notas técnicas

- **Tech**: PHP custom. Sin `__NEXT_DATA__`. Cloudflare WAF → Confidence `low`.
- **URLs de perfil**: `/escorts/{país}/{ciudad}/{slug}/` — slug suele ser numérico.
- **Phone**: NO disponible en HTML. Solo WhatsApp via `onclick="whatsApp(+PHONE,...)"`.
- **data-number**: Es el ID del anuncio (igual al slug numérico), NO un teléfono. El extractor anterior lo capturaba como phone → bug.
- **Edad**: rango ("25-36 años"), el extractor extrae solo el primer entero.
- **Altura**: rango ("165-180 cm"), mismo patrón.
- **Auto-translate**: fixture capturado sin auto-translate → labels en español son fiables.
