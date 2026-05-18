# Dating Sources — Reference

Referencia rápida para cada fuente de la vertical Dating.
Una fila por campo clave; lee el adapter correspondiente para los selectores exactos.

Leyenda columnas:

- **Render** — `SSR` = Cheerio suficiente · `JS` = Playwright necesario · `CF` = Cloudflare WAF (Playwright + evasión CF)
- **Teléfono** — `URL` = en path · `HTML` = en DOM · `❌` = no disponible sin login · `WA` = solo WhatsApp
- **Login** — qué datos quedan detrás de autenticación

---

## ardienteplacer.com ✅ v2

Example URL: `https://www.ardienteplacer.com/index.php/escort/putas-guarras-putas-particulares/madrid/632277902/92010` (Real)

| Campo        | Valor                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| Tech         | Bootstrap 3 + PHP, SSR                                                               |
| Render       | SSR — perfil y listing son páginas distintas                                         |
| Listing      | `/escorts/{category}` — paginación `?pagina=N`                                       |
| Profile URL  | `/escort/{category}/{city}/{phone}/{id}` — página de detalle real (0 cards listing)  |
| Paginación   | `?pagina=N` · fallback `a[rel="next"]`                                               |
| Título       | `h3#info` (nombre completo) · fallback `h1` split en " - "                           |
| Descripción  | `div[style*="word-break: break-word"]` — quitar `.toplistingblock` anidado           |
| Ciudad       | `div.postcatblock` → "Mujeres en **Madrid** (Madrid)"                                |
| Teléfono     | **HTML** — `.modal1 .tel b` (múltiples posibles) · fallback URL 4.º segmento         |
| WhatsApp     | `.modal1 a[href*="wa.me"]` → `+34XXXXXXXXX`                                          |
| Tarifa       | `ul.entry-meta li` → "100 €/hora" → `{duration:'1h', incall:100}` (en listing cards) |
| Servicios    | **HTML** ✅ — `h5.titulo:contains("Servicios") + ul.list-unstyled li`                |
| Imágenes     | `a[data-lightbox][href^="/anuncios/"]` → `/anuncios/{id}/{id}-{imgid}-g.jpg`         |
| Age gate 18+ | `onBeforeCapture` — `button:contains("Soy mayor")`, `.btn-18`, `#acepto-18`          |
| Login        | No                                                                                   |
| Nota         | Edad/Nacionalidad disponibles en listing card (`ul.entry-meta`), no en perfil        |

---

## bluemove.es

Example URL: `https://bluemove.es/madrid/escorts/#49049` (Real)

| Campo       | Valor                                                                |
| ----------- | -------------------------------------------------------------------- |
| Tech        | desconocido (probablemente React/Vue)                                |
| Render      | JS                                                                   |
| Listing     | `/{province}/{city}/escorts/`                                        |
| Profile URL | `/{province}/{city}/escorts/{slug}` — no encontrado en HTML estático |
| Paginación  | `a[rel="next"]`                                                      |
| Teléfono    | `a[href^="tel:"]`                                                    |
| Ciudad      | URL — segmento antes de `escorts`                                    |
| Tarifas     | ❌ stub                                                              |
| Servicios   | ❌ stub                                                              |
| Login       | No                                                                   |
| Pendiente   | Confirmar estructura de perfil con Playwright                        |

---

## chicasmalas.es

**NOTA:** Esta pagina es muyy mala!!!! no scrappear

Example URL: `https://www.chicasmalas.es/maria-escort-espanola-en-orihuela-697394223/` (Real)
Example URL: `https://www.chicasmalas.es/anuncios/ruby-escort-colombiana-murcia/` (Real)

| Campo       | Valor                                 |
| ----------- | ------------------------------------- |
| Tech        | WordPress + Elementor + WooCommerce   |
| Render      | JS (listing cards Elementor)          |
| Listing     | `/escorts/{city}/`                    |
| Profile URL | WooCommerce product o CPT — TBD       |
| Paginación  | `a[rel="next"]`, `.next.page-numbers` |
| Teléfono    | `a[href^="tel:"]`                     |
| Imágenes    | `.woocommerce-product-gallery img`    |
| Tarifas     | ❌ stub                               |
| Servicios   | ❌ stub                               |
| Login       | No                                    |

---

## citapasion.com

Example URL: `https://citapasion.com/escorts/17533` (Real)

| Campo       | Valor                                                             |
| ----------- | ----------------------------------------------------------------- |
| Tech        | PHP + custom JS                                                   |
| Render      | JS (listing AJAX)                                                 |
| Listing     | `/escorts/{province}/{city}`                                      |
| Profile URL | TBD — cards se cargan por AJAX, URL de perfil desconocida         |
| Paginación  | TBD                                                               |
| Teléfono    | TBD                                                               |
| Login       | No                                                                |
| Pendiente   | Interceptar petición AJAX del listing para extraer URLs de perfil |

---

## destacamos.net

Example URL: `https://www.escort-advisor.xxx/opiniones/667554247` (Real)

| Campo       | Valor                                      |
| ----------- | ------------------------------------------ |
| Tech        | PHP (SSR)                                  |
| Render      | SSR                                        |
| Listing     | TBD                                        |
| Profile URL | `…/details.html` — ID extraído de `/{id}-` |
| Paginación  | `div.paginator a[rel="next"]`              |
| Teléfono    | **HTML** — `a[href^="tel:"]`               |
| Ciudad      | DOM                                        |
| Imágenes    | DOM                                        |
| Login       | No                                         |

---

## erosguia.com ✅ v2

Example URL: `https://www.erosguia.com/55383.html` (Real)

| Campo         | Valor                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------- |
| Tech          | Laravel + Alpine.js + Tailwind v4                                                                   |
| Render        | **SSR** — todo el contenido en HTML estático a pesar de Alpine                                      |
| Listing       | `/escorts-{city}` · `/escorts-espana`                                                               |
| Profile URL   | `/{id}.html` — ID numérico en path                                                                  |
| Paginación    | `?pagina=N`                                                                                         |
| Nickname      | `h1.title-ad span:first-child`                                                                      |
| Teléfono call | **title** — patrón `- NNN NNN NNN -` (puede diferir del número WA)                                 |
| WA phone      | `a[href*="wa.me"]` (static attr) → `+34XXXXXXXXX` — número distinto al call en este fixture        |
| Telegram      | `a[href^="https://t.me"]` → `otherPlatforms[{platform:'telegram'}]`                                |
| Ciudad        | `[data-position="responsive"] .ficha-info .grid` campo "Ciudad" (evitar panel desktop duplicado)    |
| Atributos     | Edad, Nacionalidad, Estatura, Idiomas — `[data-position="responsive"] .ficha-info .grid` pares div  |
| Idiomas       | string CSV en div, e.g. "Español, Inglés" — split por coma                                         |
| Servicios     | `[data-position="responsive"] .ficha-services > div` — aficiones/hobbies (no tarifas)              |
| Bio           | `[data-position="responsive"] .ficha-about [x-ref="content"]`                                      |
| Cover photo   | `.ficha-row-img img[src*="eros.bz"]` — fuera de ambos panels                                       |
| Gallery       | `.ficha-imagenes .ficha-imagen img[src*="eros.bz"]` — 6 fotos en fixture                           |
| Login         | No                                                                                                  |
| v2 adapter    | `src/infrastructure/adapters/sources/dating/erosguia/` — 82 tests (1 HTML fixture)                 |
| Nota          | Dos panels idénticos (`data-position="desktop"` hidden + `"responsive"` visible) — scope al responsive para evitar duplicados |

---

## escort-advisor.xxx

Example URL: `https://www.escort-advisor.xxx/opiniones/667554247` (Real)

| Campo       | Valor                                          |
| ----------- | ---------------------------------------------- |
| Tech        | desconocida                                    |
| Render      | **CF** — Cloudflare WAF en homepage y listados |
| Listing     | TBD                                            |
| Profile URL | `/escorts/{country}/{city}/{slug}/`            |
| Paginación  | TBD                                            |
| Teléfono    | TBD post-CF bypass                             |
| Login       | No (asumido)                                   |
| Pendiente   | Análisis completo post-CF bypass               |

---

## eurogirlsescort.es / .com ✅ v2

Example URL: `https://www.eurogirlsescort.com/escort/sofia/1053224/?list=netqc` (Real)

| Campo       | Valor                                                                    |
| ----------- | ------------------------------------------------------------------------ |
| Tech        | SSR (PHP custom — Nette framework)                                       |
| Render      | SSR (+ `onBeforeCapture` para age gate o cookies)                        |
| Listing     | `/escorts/spain/...`                                                     |
| Profile URL | `…/escort/{slug}/{id}/` — contiene `/escort/`, sin `?list=`              |
| Paginación  | `?profile-paginator-page=N`                                              |
| Teléfono    | **HTML** — `a.js-phone[href^="tel:"]`, WhatsApp via `.icon-whatsapp`     |
| Tarifas     | **HTML** ✅ — `.rates table tbody tr`, primary + EUR conversion          |
| Servicios   | **HTML** ✅ — `.services table tbody tr`, included/extra columns         |
| Reviews     | **HTML** ✅ — `.reviews #reviews-content .item`                          |
| Params      | `.params > div` pares label/value — slugs de city/country desde `<a href>` |
| Mapa        | `#incall-map[data-lat][data-lng]` — lat/lng del incall                   |
| Login       | No                                                                       |
| v2 adapter  | `src/infrastructure/adapters/sources/dating/eurogirlsescort/` — 105 tests |

---

## gemidos.tv

Example URL: `https://gemidos.tv/helena-negrini` (Real)

| Campo       | Valor                             |
| ----------- | --------------------------------- |
| Tech        | desconocida                       |
| Render      | **CF** — Cloudflare WAF           |
| Listing     | `/espana`, `/madrid`, etc.        |
| Profile URL | `/anuncio/{slug}/` (especulativo) |
| Teléfono    | TBD                               |
| Login       | No (asumido)                      |
| Pendiente   | Análisis completo post-CF bypass  |

---

## girlsbcn.net / girlsbcn.com ✅ v2

Example URL: `https://www.girlsbcn.net/escort/gbcamila105.html` (Real)

| Campo        | Valor                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Tech         | PHP SSR                                                                                            |
| Render       | SSR                                                                                                |
| Listing      | `/escorts-girl/` (con paginación `a[rel="next"]`)                                                  |
| Profile URL  | `/escort/{slug}.html`                                                                              |
| Teléfono     | **HTML** — `p.telefono a[href^="tel:"]` · fallback `p.foto.css_escort img[alt]` (digits)           |
| WhatsApp     | `a[href*="wa.me"]` → `wa.me/(\d+)`                                                                 |
| Ciudad       | `p.texto.css_escort` → regex `/disponible en:\s*([^.]+)/i`                                         |
| Atributos    | Edad, Medidas, Estatura, Peso, Cabello, Ojos, Nacionalidad, Idiomas, Horarios — `dl.dl-horizontal` |
| Imágenes     | `p.foto.css_escort img[src]` filtradas a dominios `gbcnmedia` · `media.`                           |
| Vídeo        | `video.css_escort source[src]`                                                                     |
| Precio rango | `p.rango.css_escort img[src]` → `perfil-N.png` → 1–5                                              |
| Login        | No                                                                                                 |
| v2 adapter   | `src/infrastructure/adapters/sources/dating/girlsbcn/` — tipos + parsers + extractor + mapper     |

---

## girlsmadrid.com ✅ v2

Example URL: `https://www.girlsmadrid.com/escort-lucia167.html` (Real)

| Campo        | Valor                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Tech         | PHP SSR — mismo backend gbcnmedia que GirlsBCN, HTML template distinto                            |
| Render       | SSR                                                                                                |
| Profile URL  | `/{slug}.html`                                                                                     |
| Título       | `.heading h1` — ALL-CAPS → title case en extractor                                                 |
| Teléfono     | `div.telefono a[href^="tel:"]`                                                                     |
| WhatsApp     | `a[href*="wa.me"]`                                                                                 |
| Ciudad       | Hardcodeada `'Madrid'` (no presente en HTML)                                                       |
| Atributos    | `ul.meta-post li label/span` — mismos campos que GirlsBCN                                          |
| Imágenes     | `.foto.media-box .media-box-image img` — `data-src` primero, luego `src`                           |
| Encuentros   | `.widget .tags li` → `meetingPlaces[]`                                                             |
| Precio rango | `.widget h4:contains("tarifas") ~ img[src]` → `perfil-N.png` → 1–5                               |
| Login        | No                                                                                                 |
| v2 adapter   | `src/infrastructure/adapters/sources/dating/girlsmadrid/` — extractor + mapper (tipos y parsers de girlsbcn/) |

---

## hotvalencia.com

Example URL: `https://hotvalencia.com/puta-valencia/607413804-hilary-luxury-experience-639873/` (Real)

| Campo       | Valor                                                          |
| ----------- | -------------------------------------------------------------- |
| Tech        | WordPress + Elementor + JetEngine (custom post types)          |
| Render      | JS (listing members-only)                                      |
| Listing     | **LOGIN requerido** — miembros únicamente                      |
| Profile URL | `/putas-valencia/{slug}/`                                      |
| Paginación  | `a[rel="next"]`, `.next.page-numbers`                          |
| Teléfono    | `a[href^="tel:"]`                                              |
| WhatsApp    | `a[href*="wa.me"]`                                             |
| Vídeo       | `video` element → badge `video`                                |
| Tarifas     | ❌ stub                                                        |
| Servicios   | ❌ stub                                                        |
| Login       | Sí — listing inasequible sin cuenta; perfiles quizá accesibles |

---

## loquosex.com ✅ v2

Example URL: `https://www.loquosex.com/ven-a-conocerme-no-te-vas-a-arrepentir-677684329.html/` (Real)

| Campo       | Valor                                                                        |
| ----------- | ---------------------------------------------------------------------------- |
| Tech        | PHP (WordPress o custom)                                                     |
| Render      | SSR                                                                          |
| Listing     | TBD                                                                          |
| Profile URL | `*.html` (excluye `/page/`)                                                  |
| Paginación  | `a.nextpostslink`                                                            |
| Teléfono    | `.numero-telefono` + fallback `a[href^="tel:"]`                              |
| WhatsApp    | `a[href*="api.whatsapp.com"]` → `?phone=` param; fallback `a[href*="wa.me"]` |
| sourceId    | 9-digit phone from URL slug                                                  |
| Ciudad      | `ul[class^="caracteristicas-detalle"]` → Localidad links (3rd breadcrumb)    |
| Servicios   | `ul[class^="si-no-"]` icons zip `ul[class^="servicios-"]` names (included=SI)|
| Imágenes    | `section.caja-fotos li.photo_list img` — strip `?v=` query, deduplicate      |
| isPremium   | `.cabecera-titulo` text contains "premium"                                   |
| Login       | No                                                                           |

---

## madrid69.com

Example URL: `https://www.madrid69.com/citas-chicas-madrid-44064-thalia-pura-ternura-644417235` (Real)

| Campo       | Valor                                              |
| ----------- | -------------------------------------------------- |
| Tech        | Next.js — **CSR puro** (no `__NEXT_DATA__` SSR)    |
| Render      | JS                                                 |
| Listing     | `/citas/{city}`                                    |
| Profile URL | TBD — sin SSR, URLs no visibles en HTML estático   |
| Teléfono    | TBD                                                |
| Login       | No                                                 |
| Pendiente   | Interceptar llamadas de API Next.js con Playwright |

---

## milescorts.es ✅ v2

Example URL: `https://www.milescorts.es/escorts-y-putas/madrid-ciudad/631594827-escort-sexy-396681.htm` (Real)

| Campo       | Valor                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| Tech        | Bootstrap 3 + PHP                                                         |
| Render      | SSR                                                                       |
| Listing     | `/escorts-y-putas/{city}`                                                 |
| Profile URL | `/escorts-y-putas/{city}/{phone}-{slug}-{id}.htm`                         |
| Paginación  | `?page=N`                                                                 |
| sourceId    | Last numeric segment of filename (`\d+\.htm$`)                            |
| Teléfono    | **URL** — first `\d{9,}` segment of filename; fallback `a[href^="tel:"]`  |
| WhatsApp    | `a[href*="wa.me"]` or `a[href*="api.whatsapp.com"]`                       |
| Ciudad      | **URL** — penultimate path segment (replace `-` → ` `)                    |
| Imágenes    | `#fotos-anuncio img` — prefer `data-original` (lazy), fallback `src`      |
| Verificada  | `a.btn-success[href*="fotos-reales"]` or `.label-success:Verificada`      |
| Tarifas     | ❌ not in HTML                                                            |
| Servicios   | ❌ not in HTML                                                            |
| Login       | No                                                                        |

---

## milpasiones.com

Example URL: `https://milpasiones.com/anuncio/662583238-carinosa-morbosa-muy-implicada-24horas-x-estepona_215990/` (Real)

| Campo       | Valor                                                                   |
| ----------- | ----------------------------------------------------------------------- |
| Tech        | PHP custom                                                              |
| Render      | JS (body JS-rendered; `<head>` OG tags SSR)                             |
| Listing     | TBD                                                                     |
| Profile URL | `/anuncio/{phone}-{slug}_{id}/`                                         |
| Paginación  | `?pag=N`                                                                |
| Teléfono    | **URL** — primer segmento `\d{9,}` del path (`668***` ofuscado en HTML) |
| Ciudad      | `meta[name="geo.placename"]` (en `<head>`, SSR)                         |
| Título      | `meta[property="og:title"]`                                             |
| Descripción | `meta[property="og:description"]`                                       |
| Imágenes    | `meta[property="og:image"]` + gallery lazy                              |
| Login       | No                                                                      |

---

## mislios.com

Example URL: `https://mislios.com/escorts/valencia/amber-38203/` (Real)

| Campo       | Valor                               |
| ----------- | ----------------------------------- |
| Tech        | WordPress + plugin propio "mislios" |
| Render      | JS (listing AJAX)                   |
| Listing     | TBD                                 |
| Profile URL | `/anuncios/{slug}` (especulativo)   |
| Teléfono    | TBD                                 |
| Login       | No                                  |
| Pendiente   | Análisis de perfil con Playwright   |

---

## nuevoloquo.ch / .com / .es

Example URL: `https://www.nuevoloquo.ch/masaje-erotico/madrid/masajista-espanola-por-aqui-llamame-no-lo-dudes/629971/` (Real)

| Campo       | Valor                                                      |
| ----------- | ---------------------------------------------------------- |
| Tech        | desconocida (SSR parcial)                                  |
| Render      | SSR + `onBeforeCapture` (cookie / age gate)                |
| Profile URL | `/escort/{province}/{slug}/{id}/`                          |
| Paginación  | `a[rel="next"]`, `.page-link[aria-label="Next"]`, `a.next` |
| Teléfono    | **❌** — no disponible en HTML                             |
| Ciudad      | DOM                                                        |
| Imágenes    | lazy `data-src`                                            |
| Login       | No                                                         |

---

## nuevapasion.com

Example URL: `https://nuevapasion.com/anuncio/quieres-disfrutar-ven-j9ZZ3vFBjb` (Real)

| Campo       | Valor                                                 |
| ----------- | ----------------------------------------------------- |
| Tech        | Bootstrap 5 + PHP                                     |
| Render      | JS — age gate `#edadPopup` bloquea todo el contenido  |
| Listing     | TBD                                                   |
| Profile URL | `/anuncio/{slug}`                                     |
| Paginación  | `a[rel="next"]`                                       |
| Teléfono    | **HTML** — `a[href^="tel:"]`                          |
| Imágenes    | lazy `data-src`                                       |
| Tarifas     | ❌ stub                                               |
| Servicios   | ❌ stub                                               |
| Age gate    | `onBeforeCapture` → `#edadPopup button.btn-primary`   |
| Cookie      | `#cookieButton` flotante, `#cookieModal` con acordeón |
| Login       | No                                                    |

---

## topescortbabes.com

Example URL: `https://topescortbabes.com/barcelona/escorts/Lera_4091523` (Real)

| Campo        | Valor                                                               |
| ------------ | ------------------------------------------------------------------- |
| Tech         | desconocida                                                         |
| Render       | **CF** — Cloudflare WAF                                             |
| Listing      | `/es/spain/escorts`                                                 |
| Profile URL  | `/es/spain/escorts/{slug}` — 4+ segmentos con `escorts` en índice 2 |
| Datos filtro | **Muy estructurados** en el filtro de listing — pendiente post-CF   |
| Teléfono     | TBD                                                                 |
| Login        | No (asumido)                                                        |
| Pendiente    | Análisis de selectors de filtro y perfil post-CF bypass             |

---

## Resumen por estado

### v2 adapter completo ✅

- **topescortbabes.com** — CF, JSON embebido, 105 tests (51 JSON fixtures + 2 HTML)
- **eurogirlsescort.es/com** — SSR, tarifas + servicios + reviews, 105 tests (1 HTML fixture)
- **girlsbcn.net** — SSR PHP, atributos dl-horizontal, WA, video, rango precio — shared types+parsers+mapper
- **girlsmadrid.com** — SSR PHP, template diferente, ciudad hardcoded, usa tipos/mapper de girlsbcn
- **erosguia.com** — SSR Laravel, dual panel data-position, call≠WA phone, telegram, 82 tests (1 HTML fixture)

### Implementación completa (SSR + todos los campos — pendiente port v2)
- **loquosex.com** — SSR, teléfono + servicios
- **milescorts.es** — SSR, teléfono + ciudad desde URL

### Parcial (teléfono desde URL, resto stub)

- **ardienteplacer.com** — SSR, teléfono en modal estático HTML, tarifa, edad, nacionalidad, WhatsApp
- **milpasiones.com** — teléfono en URL, OG tags para título/ciudad/imagen
- **destacamos.net** — teléfono en DOM

### Requiere Playwright (age gate / JS-render)

- **nuevoloquo.ch/com/es** — `onBeforeCapture`
- **nuevapasion.com** — age gate `#edadPopup`
- **bluemove.es** — JS-rendered
- **chicasmalas.es** — listing JS (Elementor)
- **citapasion.com** — listing AJAX
- **madrid69.com** — CSR Next.js
- **milpasiones.com** — body JS (head SSR)
- **mislios.com** — listing AJAX

### Login necesario para datos clave

- **hotvalencia.com** — listing members-only (perfiles posiblemente públicos)

### Pendiente análisis (CF WAF)

- **escort-advisor.xxx**
- **gemidos.tv**
- **topescortbabes.com** ← datos muy estructurados en filtro, prioritario post-bypass

### Pendiente de añadir adapador

- **zukery.com**
