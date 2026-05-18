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

## bluemove.es ✅ v2

Example URL: `https://bluemove.es/madrid/escorts/#49049` (Real)

| Campo        | Valor                                                                     |
| ------------ | ------------------------------------------------------------------------- |
| Tech         | Bootstrap 5 / Swiper, SSR perfiles                                        |
| Render       | SSR perfiles · age gate JS (Playwright para discovery y age gate)         |
| Listing      | `/{city}/escorts/` — cards con `data-ficha-id` → `#{id}` URLs             |
| Profile URL  | `/{city}/escorts/#{numericId}` — hash fragment es sourceId                |
| Paginación   | `a[rel="next"]`                                                           |
| Título       | Primera imagen `.ficha-images-slider img` → alt                           |
| Nickname     | alt.split(',')[0] title-cased · fallback `#services h4` "Servicios de…"  |
| Descripción  | `#fichaContent .ad-description-text`                                      |
| Ciudad       | `#fichaContent .ficha-data-row` "Ciudad" → strip `(Province)` · URL path |
| Teléfono     | **HTML** — `#phoneCallSection a[href^="tel:"]`                            |
| WhatsApp     | `#phoneCallSection a[href*="wa.me"]`                                      |
| Telegram     | `#phoneCallSection a[href*="t.me"]`                                       |
| Instagram    | `.ficha-social-media a[href*="instagram.com"]` → guardado en attributes  |
| Verificada   | `.ficha-top-line img[src*="verificada"]` o `.ficha-verified-images-info`  |
| Servicios    | `#services ul:not(.not-services) li a`                                    |
| Pagos        | `#extra-info .not-services li a` filtrado por keywords                    |
| Imágenes     | `.ficha-images-slider img` · fallback `og:image`                          |
| Login        | No                                                                        |
| País         | ES                                                                        |
| Nota         | Datos: Edad, Estatura, Peso, Pelo, Ojos, Nac., Idiomas, Tatuajes, Pubis  |

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

## citapasion.com ✅ v2

Example URL: `https://citapasion.com/escorts/17533` (Real)

| Campo        | Valor                                                                   |
| ------------ | ----------------------------------------------------------------------- |
| Tech         | PHP + Slick slider, SSR profiles                                        |
| Render       | SSR perfiles · listing AJAX (necesita Playwright para discovery)        |
| Listing      | `/escorts/{province}/{city}` — AJAX                                     |
| Profile URL  | `/escorts/{numericId}` — ID numérico es sourceId                        |
| Paginación   | N/A (listing AJAX)                                                      |
| Título       | `h1` split por `|`                                                      |
| Descripción  | `.card-perfil.sobre__mi .text__description`                             |
| Ciudad       | `.card-perfil.datos_interes li` → "Ciudad:" row                         |
| Teléfono     | **HTML** — `[data-href^="tel:"]` (AJAX-revealed) · fallback `a[href^="tel:"]` |
| WhatsApp     | `[data-accion*="wa.me"]` · fallback `a[href*="wa.me"]`                 |
| Tarifas      | ❌ — no disponible en HTML estático                                     |
| Servicios    | ❌ — no disponible                                                      |
| Imágenes     | `.slider-fichas a[data-fslightbox="gallery"]` → `href` (full-size)     |
| Rating       | `.reviews .stars` style `--rating:X` · `.reviews span` count `(N)`     |
| Login        | No                                                                      |
| País         | ES                                                                      |
| Nota         | Datos: Edad, Altura, Peso, Pelo, Ojos, Etnia, Nac., Idiomas en DOM     |

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

## escort-advisor.xxx ✅ v2

Example URL: `https://www.escort-advisor.xxx/escorts/spain/madrid/diana-667554247/` (Real)

| Campo        | Valor                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| Tech         | PHP Custom (desconocida)                                                    |
| Render       | **CF** — Cloudflare WAF — Playwright + CF bypass necesario                  |
| Listing      | `/escorts/{country}/{city}/`                                                |
| Profile URL  | `/escorts/{country}/{city}/{slug}/` — sourceId = numeric suffix o slug     |
| Paginación   | `a[rel="next"], a.next-page, [aria-label="Next"]`                           |
| Título       | `.username h2`                                                              |
| Descripción  | `.data-container .content`                                                  |
| Ciudad       | Breadcrumb `[class*="breadcrumb"] a` eq(2) — no extraído en extractor      |
| Teléfono     | **HTML** — `a[href^="tel:"]`                                                |
| Verificada   | `.verified-badge, .icon-ok-circled`                                         |
| Servicios    | `.preferences .info-list li`                                                |
| Imágenes     | `.gallery_tray img, .user_image, .banner_image` · fallback `og:image`       |
| Datos        | `.personal-info .info-list li` → "Label: value" — Edad, Altura, Peso, Nac. |
| Login        | No                                                                          |
| País         | ES / Internacional                                                          |
| Nota         | CF WAF — Playwright con bypass. City en breadcrumb (no extraído aún)        |

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

## gemidos.tv ✅ v2

Example URL: `https://gemidos.tv/anuncio/lucia-escort-madrid/` (Real)

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tech         | Desconocida (CF WAF protected)                                                |
| Render       | **CF** — Cloudflare WAF — Playwright + CF bypass necesario                   |
| Listing      | `/espana`, `/{city}`, etc.                                                    |
| Profile URL  | `/anuncio/{slug}/` — slug es sourceId                                         |
| Paginación   | `a[rel="next"]`                                                               |
| Título       | `.pub-title` (puede contener emojis)                                          |
| Nickname     | Primer \w+ del título (strip emoji)                                           |
| Descripción  | `.pub-about-full`                                                             |
| Ciudad       | ❌ — no disponible en HTML estático                                           |
| Teléfono     | **HTML** — `.pub-phone span` (texto plano, no href)                           |
| Tarifas      | ❌ — no disponible                                                            |
| Servicios    | `.pub-services .pub-tags-item, .pub-tags-item.pub_services`                   |
| Imágenes     | `.pub-picture img, .pub-book-item img, .story img` · fallback `og:image`      |
| Verificada   | `.badge-verified, .fa-shield-check`                                           |
| Tags datos   | `.pub-tags-item.number` → `Años`/`CM`/`KG` · `.pub-tags-item small` → labels |
| Login        | No                                                                            |
| País         | ES                                                                            |
| Nota         | CF WAF — Playwright con bypass necesario para acceder a perfiles              |

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

## hotvalencia.com ✅ v2

Example URL: `https://hotvalencia.com/putas-valencia/valentina-escortvalencia/` (Fixture)

| Campo       | Valor                                                          |
| ----------- | -------------------------------------------------------------- |
| Tech        | WordPress + Elementor + JetEngine (custom post types)          |
| Render      | SSR (perfiles), JS (listing members-only)                      |
| Listing     | **LOGIN requerido** — miembros únicamente                      |
| Profile URL | `/putas-valencia/{slug}/`                                      |
| sourceId    | último segmento de la URL                                      |
| Nickname    | primera palabra del `h1` (`.entry-title`, `.elementor-heading-title`, `h1`) |
| Bio         | `.elementor-text-editor`, `.entry-content p`                   |
| Teléfono    | `a[href^="tel:"]` → 9 dígitos                                  |
| WhatsApp    | ❌ no detectado                                                |
| Imágenes    | `.elementor-image img, .wp-post-image` → `src`; fallback `og:image` |
| Vídeo       | `video` element → `hasVideo = true` → `statistics.videoCount = 1` |
| Ciudad      | ❌ no extraíble sin login                                      |
| Servicios   | ❌ stub                                                        |
| Login       | Sí — listing inasequible; perfiles accesibles directamente     |
| Confidence  | `low` (0.5) — listing requiere login                           |
| v2 adapter  | `src/infrastructure/adapters/sources/dating/hotvalencia/`      |

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

## milpasiones.com ✅ v2

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

## mislios.com ✅ v2

Example URL: `https://mislios.com/anuncios/ana-escort-madrid/` (Real)

| Campo        | Valor                                                             |
| ------------ | ----------------------------------------------------------------- |
| Tech         | WordPress + plugin propio "mislios" (SSR perfiles)                |
| Render       | SSR — perfiles individuales SSR · listing AJAX                    |
| Listing      | Listing AJAX — no scrapeable con Cheerio                          |
| Profile URL  | `/anuncios/{slug}/` — slug es el sourceId                         |
| Paginación   | N/A (listing AJAX)                                                |
| Título       | `h1` · fallback `.msl-profile-name`                               |
| Descripción  | `.msl-profile-desc` · fallback `.profile-text`                    |
| Ciudad       | ❌ — no disponible en HTML estático                               |
| Teléfono     | **HTML** — `a[href^="tel:"]`                                      |
| WhatsApp     | ❌ — no detectado                                                 |
| Tarifas      | ❌ — no disponible                                                |
| Servicios    | ❌ — no disponible                                                |
| Imágenes     | `.msl-gallery img` (`src` o `data-src`) · fallback `og:image`     |
| Login        | No                                                                |
| País         | ES (España — fuente exclusivamente española)                      |
| Nota         | Edad/Nacionalidad/Ciudad no en HTML estático de perfil            |

---

## nuevoloquo.ch / .com / .es ✅ v2

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

| v2 adapter  | `src/infrastructure/adapters/sources/dating/nuevoloquo/` — 57 tests |

---

## nuevapasion.com ✅ v2

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

- **nuevapasion.com** — SSR PHP, phone tel:, og:image fallback, 33 tests
- **nuevoloquo.ch/com/es** — SSR, detalle completo, sin teléfono (Playwright), 57 tests
- **topescortbabes.com** — CF, JSON embebido, 105 tests (51 JSON fixtures + 2 HTML)
- **eurogirlsescort.es/com** — SSR, tarifas + servicios + reviews, 105 tests (1 HTML fixture)
- **girlsbcn.net** — SSR PHP, atributos dl-horizontal, WA, video, rango precio — shared types+parsers+mapper
- **girlsmadrid.com** — SSR PHP, template diferente, ciudad hardcoded, usa tipos/mapper de girlsbcn
- **erosguia.com** — SSR Laravel, dual panel data-position, call≠WA phone, telegram, 82 tests (1 HTML fixture)
- **loquosex.com** — SSR, teléfono + servicios, 75 tests
- **milescorts.es** — SSR, teléfono + ciudad desde URL, 54 tests
- **ardienteplacer.com** — SSR, teléfono en modal estático HTML, tarifa, edad, nacionalidad, WhatsApp, 57 tests
- **milpasiones.com** — teléfono en URL, OG tags para título/ciudad/imagen, 36 tests
- **destacamos.net** — teléfono en DOM, isPremium, altura, 56 tests

### Requiere Playwright (age gate / JS-render)

- ~~**nuevoloquo.ch/com/es**~~ — ported to v2 (phone still needs Playwright click)
- ~~**nuevapasion.com**~~ — ported to v2 (age gate needs Playwright for listing)
- ~~**bluemove.es**~~ — ported to v2 (Playwright needed for age gate + listing discovery)
- **chicasmalas.es** — listing JS (Elementor)
- ~~**citapasion.com**~~ — ported to v2 (listing AJAX — Playwright needed for discovery)
- **madrid69.com** — CSR Next.js
- **milpasiones.com** — body JS (head SSR)
- ~~**mislios.com**~~ — ported to v2 (listing AJAX — Playwright needed for discovery)

### Login necesario para datos clave

- ~~**hotvalencia.com**~~ — ported to v2 (listing members-only; profiles accessible directly)

### Pendiente análisis (CF WAF)

- ~~**escort-advisor.xxx**~~ — ported to v2 (CF WAF — Playwright + bypass required)
- ~~**gemidos.tv**~~ — ported to v2 (CF WAF — Playwright + bypass required)
- **topescortbabes.com** ← datos muy estructurados en filtro, prioritario post-bypass

### Pendiente de añadir adapador

- **zukery.com**
