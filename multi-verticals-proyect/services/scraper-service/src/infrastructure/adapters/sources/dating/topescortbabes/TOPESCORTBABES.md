# topescortbabes.com — Estructura del perfil

> Análisis sobre HTML real (fixtures `luna.html` 567KB, `lera.html` 507KB).
> Tipos completos en `topescortbabes.types.ts` (inferidos de 51 JSONs reales).
> ✅ implementado · ⚠️ presente en payload pero no mapeado · ❌ no disponible.

---

## Tech

- **Render**: CSR. Body HTML mínimo. Todo el contenido en `window.profileData` JS object literal embebido en `<script>`.
- **CF**: Cloudflare WAF activa. Playwright + bypass necesario.
- **Estructura**: `window.profileData = { … };` (no estricto JSON pero compatible — el extractor usa `new Function(…)` para evaluar).
- **URL perfil**: `/{country|city}/escorts/{Slug_numericId}` — sourceId = numérico final del slug.

---

## Identificación

| Campo       | Origen                                  | Ejemplo                        | Estado |
| ----------- | --------------------------------------- | ------------------------------ | ------ |
| `sourceId`  | `payload.id` o numérico del slug de URL | `4109372`                      | ✅     |
| `sourceUrl` | URL completa de la página               | `/madrid/escorts/Luna_4109372` | ✅     |
| `canonical` | `payload.canonical`                     | URL canónica para SEO          | ✅     |
| `nickname`  | `payload.nickname`                      | `"Luna"`                       | ✅     |

---

## Estructura `window.profileData`

Tres capas conceptuales (ver `topescortbabes.types.ts`):

1. **PROFILE** — datos del Presenter (id, nickname, photos, prices…)
2. **MASTER** — catálogos compartidos (Country, City, Currency)
3. **PAGE / SEO** — render de la página (breadcrumb, meta\*, faqs, pageSchema)

---

## Contacto

```js
"phoneNumber": null,
"encodedPhoneNumber": "RVBUWVlbZW...",  // cifrado, decode client-side
"encodedTelegram":    "JyomNihgY2...",
"contactOptions": ["Whatsapp","SMS","Telegram"]
```

| Campo                | Origen                       | Notas                                | Estado |
| -------------------- | ---------------------------- | ------------------------------------ | ------ |
| `phoneNumber`        | `payload.phoneNumber`        | Casi siempre `null` en HTML estático | ⚠️     |
| `encodedPhoneNumber` | `payload.encodedPhoneNumber` | Pasa a canonical sin decode          | ✅     |
| `encodedTelegram`    | `payload.encodedTelegram`    | Pasa a canonical sin decode          | ✅     |
| `contactOptions`     | `payload.contactOptions[]`   | Mapeado a `contactOptions` canonical | ✅     |

---

## Precios

```js
"prices": [
  {"label":"1 hour", "price":"120", "currency":"EUR"},
  {"label":"12 hours","price":"1100","currency":"EUR"}
],
"minimumPrice": "from 120 €",
"priceLabelType": "lower",
"serviceText": "Ofrezco servicios <b>en mi piso</b> y <b>a domicilio o en hotel</b>."
```

| Campo            | Origen                   | Notas                            | Estado |
| ---------------- | ------------------------ | -------------------------------- | ------ |
| `prices`         | `payload.prices[]`       | Mapeado a `prices` canonical     | ✅     |
| `minimumPrice`   | `payload.minimumPrice`   | A `attributes.minimumPrice`      | ✅     |
| `priceLabelType` | `payload.priceLabelType` | Enum: `"lower"` o null           | ✅     |
| `serviceText`    | `payload.serviceText`    | HTML — a `serviceText` canonical | ✅     |

---

## Personal details (HtmlString)

Cada campo viene con `<a href>` embebido (taxonomía). El **texto** del link es el valor real.

```js
"personalDetails": {
  "location":   "<a>Spain</a>, <a>Madrid</a>",
  "nationality":"<a>Russian</a>",
  "ethnic":     "<a>latina</a>",
  "age":        "25",
  "height":     "<a>177cm / 5'10\"</a>",
  "weight":     "<a>54kg / 119lbs</a>",
  "hair":       "<a>brown hair</a>",
  "eyes":       "<a>brown eyes</a>",
  "orientation":"<a>Heterosexual</a>",
  "meetingWith":"meeting with a man",
  "meetingPlace":"<b>at my flat</b> and <b>at hotel</b>",
  "languages":  "speaks English and Spanish",
  "bust":"95","hip":"90","waist":"60"
}
```

| Campo           | Parse                     | Estado |
| --------------- | ------------------------- | ------ |
| `age`           | numeric string → int      | ✅     |
| `height/weight` | regex `(\d+)cm`/`(\d+)kg` | ✅     |
| `nationality`   | strip `<a>` tags          | ✅     |
| `ethnic`        | strip `<a>` tags          | ✅     |
| `hair/eyes`     | strip `<a>` tags + slug   | ✅     |
| `orientation`   | strip tags + slug         | ✅     |
| `languages`     | text → array              | ✅     |

---

## Ciudad / Ubicación

```js
"baseCity": {
  "id":"102","name":"Madrid","url_segment":"madrid",
  "country":{"id":"226","iso2":"es","name":"Spain","subdomain":"spain"},
  "lat":"40.4167","lng":"-3.7167"
},
"currentCity": {…}  // mismo schema
```

| Campo         | Origen                 | Estado |
| ------------- | ---------------------- | ------ |
| `baseCity`    | `payload.baseCity`     | ✅     |
| `currentCity` | `payload.currentCity`  | ✅     |
| lat/lng       | `.lat` `.lng` (string) | ✅     |

---

## Badges / Verificación

```js
"badges": {"verified":true,"trans":false,"vip":true,"pornstar":false},
"humanVerified": false,
"statisticsData": {"pic":20,"vid":1,"vip":1,"ver":1,"tour":0,"ab":0}
```

| Campo            | Origen                       | Estado |
| ---------------- | ---------------------------- | ------ |
| `verified`       | `payload.badges.verified`    | ✅     |
| `vip`            | `payload.badges.vip`         | ✅     |
| `trans`          | `payload.badges.trans`       | ✅     |
| `pornstar`       | `payload.badges.pornstar`    | ✅     |
| `statistics.pic` | `payload.statisticsData.pic` | ✅     |
| `statistics.vid` | `payload.statisticsData.vid` | ✅     |

---

## Fotos / Media

```js
"photos": [{
  "thumbnail":"https://imagehost.topescortbabes.com/.../...webp",
  "srcset":"…","path":"…","path_srcset":"…",
  "width":760,"height":1140,
  "verification_level":1,    // -1=no, 1=Similar, 2=SlightlyDifferent
  "verification_text":"…","verification_at":"hace X días",
  "uploaded_on":"hace Y meses"
}],
"mainMedia": {
  "type":"video","path":"https://.../full.mp4",
  "poster":"https://img.../poster.jpg",
  "orientation":"portrait","width":"1080","height":"1920"
}
```

| Campo       | Origen              | Estado |
| ----------- | ------------------- | ------ |
| `photos[]`  | `payload.photos[]`  | ✅     |
| `mainMedia` | `payload.mainMedia` | ✅     |

---

## Reviews

```js
"reviewsCount": 0, "reviewsRating": 0,
"reviewEnabled": true,
"reviewsOverall": {
  "count":N,"tags":[…],"average_ratings":{…},
  "meet_again_percentage":N,"new_reviews_count":N,"has_old_review":bool
},
"ratingDistributions": {overall, place, punctuality, looks, attitude, services, photos_accuracy},
"reviews":[{author, date, ratings:{place,punctuality,looks,…}, …}]
```

| Campo                 | Origen                          | Estado |
| --------------------- | ------------------------------- | ------ |
| `reviewsCount`        | `payload.reviewsCount`          | ✅     |
| `reviewsRating`       | `payload.reviewsRating`         | ✅     |
| `reviewsOverall`      | `payload.reviewsOverall`        | ✅     |
| `ratingDistributions` | `payload.ratingDistributions`   | ✅     |
| `reviews[]`           | `payload.reviews[]` sub-ratings | ✅     |

---

## Otras plataformas / enlaces

```js
"links": {"website": null},
"otherPlatforms": [{"name":"Real Escorts","url":"https://…"}]
```

| Campo            | Origen                     | Estado |
| ---------------- | -------------------------- | ------ |
| `links.website`  | `payload.links.website`    | ✅     |
| `otherPlatforms` | `payload.otherPlatforms[]` | ✅     |

---

## SEO / Schema.org

```js
"pageSchema": {
  "@context":"https://schema.org",
  "@graph":[Person, Organization, Service, Offer, ProfilePage, BreadcrumbList, FAQPage]
}
```

| Bloque         | Estado                                      |
| -------------- | ------------------------------------------- |
| Person         | ⚠️ no mapeado (redundante con profile data) |
| Service+Offer  | ⚠️ no mapeado (redundante con `prices`)     |
| BreadcrumbList | ⚠️ no mapeado                               |
| FAQPage        | ⚠️ no mapeado                               |

---

## Catálogos (MASTER)

`country`, `city`, `ipCountry`, `internalLinks[]`, `topCitiesForSearch[]`. No se persisten — usados para slug/SEO.

---

## Notas técnicas

- Extractor: `extractProfileDataFromHtml()` con `script:contains("window.profileData")` + regex `window\.profileData\s*=\s*(\{...\});` + `new Function("return ...;")()`.
- `attributes.minimumPrice` añadido en mapper (texto suelto, no estructurado).
- 105 tests (51 JSON fixtures + 2 HTML fixtures: luna, lera).
- `phoneNumber: null` esperado — solo se rellena vía API auth.
