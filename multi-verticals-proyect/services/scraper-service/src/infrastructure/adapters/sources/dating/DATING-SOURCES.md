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

| Campo       | Valor                                                                    |
| ----------- | ------------------------------------------------------------------------ |
| Tech        | Bootstrap 5 / Swiper, SSR perfiles                                       |
| Render      | SSR perfiles · age gate JS (Playwright para discovery y age gate)        |
| Listing     | `/{city}/escorts/` — cards con `data-ficha-id` → `#{id}` URLs            |
| Profile URL | `/{city}/escorts/#{numericId}` — hash fragment es sourceId               |
| Paginación  | `a[rel="next"]`                                                          |
| Título      | Primera imagen `.ficha-images-slider img` → alt                          |
| Nickname    | alt.split(',')[0] title-cased · fallback `#services h4` "Servicios de…"  |
| Descripción | `#fichaContent .ad-description-text`                                     |
| Ciudad      | `#fichaContent .ficha-data-row` "Ciudad" → strip `(Province)` · URL path |
| Teléfono    | **HTML** — `escort-modal .em-profile-phone[href^="tel:"]` · fallback `escort-modal .em-cta-call[href^="tel:"]` |
| WhatsApp    | `escort-modal .em-cta-whatsapp[href*="wa.me"]`                           |
| Telegram    | `escort-modal .em-cta-telegram[href*="t.me"]` → `+PHONE` (número, no username) |
| Instagram   | `.ficha-social-media a[href*="instagram.com"]` → guardado en attributes  |
| Verificada  | `.elite-ficha__verified` · `.fv-verified` · `.fg-photo-verified` (3 clases distintas observadas en HTML real) |
| Servicios   | `#services ul:not(.not-services) li a`                                   |
| Pagos       | `#extra-info .not-services li a` filtrado por keywords                   |
| Imágenes    | `.ficha-images-slider img` · fallback `og:image`                         |
| Login       | No                                                                       |
| País        | ES                                                                       |
| Nota        | Datos: Edad, Estatura, Peso, Pelo, Ojos, Nac., Idiomas, Tatuajes, Pubis. El TG `t.me/+PHONE` es via-número no username. DATING-SOURCES previo tenía `#phoneCallSection` — selector incorrecto (HTML real usa `escort-modal .em-*`). |

---

## chicasmalas.es ✅ v2

Example URL: `https://www.chicasmalas.es/anuncios/sofia-deluxe/` (Real)

| Campo                  | Valor                                                                   |
| ---------------------- | ----------------------------------------------------------------------- |
| WordPress              | **Sí** — WP 6.9.4. Discovery vía REST API (no scrapear el listado HTML) |
| Tech                   | WordPress + Elementor                                                   |
| Discovery              | `GET /wp-json/wp/v2/ficha-escort?per_page=N` → JSON, campo `link`       |
| Profile URL            | `/anuncios/{slug}/` (CPT `ficha-escort`)                                |
| Paginación             | REST `?page=N`                                                          |
| Teléfono               | `a[href^="tel:"]` ✅ — en Elementor button widget (`elementor-button-text`) |
| WhatsApp               | ⚠️ `a[href*="wa.me"]` first en fixture = WA site-wide ("publica tu anuncio"), no del perfil. Extractor puede producir false positive. |
| Telegram               | ❌ — `t.me/CHICASMALASES` = canal del site, no del perfil               |
| Imágenes               | ✅                                                                      |
| Edad / bio / servicios | ❌ — heading "Servicios." presente pero contenido HTML scrambled (`lñklbklfdklñfkhlfñkglñdfkghlñ`). Extractor roto confirmado con HTML real. |
| Login                  | No                                                                      |
| 20/05/2026             | (real) `https://www.chicasmalas.es/anuncios/sofia-deluxe/`              |

---

## citapasion.com ✅ v2

> WordPress: **No** (verificado 20/05/2026).

Example URL: `https://citapasion.com/escorts/17533` (Real)

| Campo         | Valor                                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --- |
| Tech          | PHP + Slick slider, SSR profiles                                                                                                     |
| Render        | SSR perfiles · listing AJAX (necesita Playwright para discovery)                                                                     |
| Listing       | `/escorts/{province}/{city}` — AJAX                                                                                                  |
| Profile URL   | `/escorts/{numericId}` — ID numérico es sourceId                                                                                     |
| Paginación    | N/A (listing AJAX)                                                                                                                   |
| Título        | `h1` split por `                                                                                                                     | `   |
| Descripción   | `.card-perfil.sobre__mi .text__description`                                                                                          |
| Ciudad        | `.card-perfil.datos_interes li` → "Ciudad:" row                                                                                      |
| Teléfono      | **HTML** — `[data-href^="tel:"]` (AJAX-revealed) · fallback `a[href^="tel:"]`                                                        |
| WhatsApp      | `[data-accion*="wa.me"]` · fallback `a[href*="wa.me"]`                                                                               |
| Tarifas       | ❌ — no disponible en HTML estático                                                                                                  |
| Servicios     | ❌ — no disponible                                                                                                                   |
| Imágenes      | `.slider-fichas a[data-fslightbox="gallery"]` → `href` (full-size)                                                                   |
| Rating        | `.reviews .stars[style]` → CSS `--rating: 4.5` → float                                                                               |
| Reviews count | `.reviews span` texto `(12)` → regex `\((\d+)\)`                                                                                     |
| Login         | No                                                                                                                                   |
| País          | ES                                                                                                                                   |
| Nota          | No hay JSON-LD en fixture real. Datos: Edad, Altura, Peso, Pelo, Ojos, Etnia, Nac., Idiomas en DOM. WhatsApp: `wa.me/34…` (sin `+`). |

---

## destacamos.net ✅ v2

> WordPress: **No** (verificado 20/05/2026).

Example URL: `https://www.destacamos.net/{id}-{slug}.html` (patrón)

| Campo        | Valor                                                                                   |
| ------------ | --------------------------------------------------------------------------------------- |
| Tech         | PHP SSR                                                                                 |
| Render       | SSR                                                                                     |
| Listing      | TBD                                                                                     |
| Profile URL  | `/{id}-{slug}.html` — sourceId = primer segmento numérico                               |
| Paginación   | `div.paginator a[rel="next"]`                                                           |
| Título       | `h1.hh1` (nombre directo)                                                               |
| Descripción  | `#description p` — primer párrafo                                                       |
| Teléfono     | `#detallesimportantes a[href^="tel:"]` → strip `tel:` + non-digits                     |
| WhatsApp     | `#detallesimportantes a[href*="wa.me"]` · fallback `a[href*="api.whatsapp.com"]`        |
| Datos        | `#details > div` → `span` (label) + `strong` (value): Edad, Nacionalidad, Ciudad, Zona, CP, Altura, Color de pelo, Idiomas, Horario |
| isPremium    | `.premiumdet` presente                                                                  |
| Imágenes     | `#gallery a.fimage[href]` → full-size; thumbnail en `img[src]` dentro del enlace       |
| Login        | No                                                                                      |

---

## erosguia.com ✅ v2

Example URL: `https://www.erosguia.com/55383.html` (Real)

| Campo         | Valor                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Tech          | Laravel + Alpine.js + Tailwind v4                                                                                             |
| Render        | **SSR** — todo el contenido en HTML estático a pesar de Alpine                                                                |
| Listing       | `/escorts-{city}` · `/escorts-espana`                                                                                         |
| Profile URL   | `/{id}.html` — ID numérico en path                                                                                            |
| Paginación    | `?pagina=N`                                                                                                                   |
| Nickname      | `h1.title-ad span:first-child`                                                                                                |
| Teléfono call | **title** — patrón `- NNN NNN NNN -` (puede diferir del número WA)                                                            |
| WA phone      | `a[href*="wa.me"]` (static attr) → `+34XXXXXXXXX` — número distinto al call en este fixture                                   |
| Telegram      | `a[href^="https://t.me"]` → `otherPlatforms[{platform:'telegram'}]`                                                           |
| Ciudad        | `[data-position="responsive"] .ficha-info .grid` campo "Ciudad" (evitar panel desktop duplicado)                              |
| Atributos     | Edad, Nacionalidad, Estatura, Idiomas — `[data-position="responsive"] .ficha-info .grid` pares div                            |
| Idiomas       | string CSV en div, e.g. "Español, Inglés" — split por coma                                                                    |
| Servicios     | `[data-position="responsive"] .ficha-services > div` — aficiones/hobbies (no tarifas)                                         |
| Bio           | `[data-position="responsive"] .ficha-about [x-ref="content"]`                                                                 |
| Cover photo   | `.ficha-row-img img[src*="eros.bz"]` — fuera de ambos panels                                                                  |
| Gallery       | `.ficha-imagenes .ficha-imagen img[src*="eros.bz"]` — 6 fotos en fixture                                                      |
| Login         | No                                                                                                                            |
| v2 adapter    | `src/infrastructure/adapters/sources/dating/erosguia/` — 82 tests (1 HTML fixture)                                            |
| Nota          | Dos panels idénticos (`data-position="desktop"` hidden + `"responsive"` visible) — scope al responsive para evitar duplicados |

---

## escort-advisor.xxx ✅ v2

> WordPress: **No** (verificado 20/05/2026).
> Listado real: `https://www.escort-advisor.xxx/escort/madrid1`
> Profile URL real: `/opiniones/{numericId}` (NO `/escorts/.../slug/`)
> 20/05/2026 (real): `https://www.escort-advisor.xxx/opiniones/667554247` · `https://www.escort-advisor.xxx/opiniones/606792233`

> **Estructura detallada → [escort-advisor/ESCORT-ADVISOR.md](escort-advisor/ESCORT-ADVISOR.md)**

Example URL: `https://www.escort-advisor.xxx/opiniones/667554247` (Real)

| Campo       | Valor                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| Tech        | PHP Custom, sin `__NEXT_DATA__`                                                                             |
| Render      | **CF** — Cloudflare WAF — Playwright + CF bypass necesario                                                  |
| Listing     | `/escorts/{country}/{city}/`                                                                                |
| Profile URL | `/escorts/{country}/{city}/{slug}/` — sourceId = numeric suffix o slug                                      |
| Paginación  | `a[rel="next"], a.next-page, [aria-label="Next"]`                                                           |
| Título      | `.username h2`                                                                                              |
| Descripción | `.data-container .content`                                                                                  |
| Ciudad      | `.personal-info` → "Ciudad: Madrid (M)"                                                                     |
| Teléfono    | `a[href^="tel:"]` → `parseEscortAdvisorPhone`                                                               |
| WhatsApp    | `[onclick*="whatsApp"]` → regex `whatsApp\((\+\d+)`                                                         |
| Verificada  | `.icon-ok-circled` (`.verified-badge` NO existe en HTML real)                                               |
| Servicios   | `.preferences .info-list li` — texto español                                                                |
| Imágenes    | `.gallery_tray img, .user_image, .banner_image` · fallback `og:image`                                       |
| Datos       | `.personal-info .info-list li` → Ciudad, Edad, Precio, Nacionalidad, Recibo, Altura, Figura, Ojos, Cabellos |
| Rating      | `.pdp_rating_component .tx` → float (coma decimal)                                                          |
| Reviews     | `.review.when-closed` → count                                                                               |
| Login       | No                                                                                                          |
| País        | ES / Internacional                                                                                          |
| Nota        | `data-number` = ID del anuncio, NO teléfono. CF WAF necesario.                                              |

---

## eurogirlsescort.es / .com ✅ v2

Example URL: `https://www.eurogirlsescort.com/escort/sofia/1053224/?list=netqc` (Real)

| Campo       | Valor                                                                                                                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tech        | SSR (PHP custom — Nette framework)                                                                                                                                                                                                          |
| Render      | SSR (+ `onBeforeCapture` para age gate o cookies)                                                                                                                                                                                           |
| Listing     | `/escorts/spain/...`                                                                                                                                                                                                                        |
| Profile URL | `…/escort/{slug}/{id}/` — contiene `/escort/`, sin `?list=`                                                                                                                                                                                 |
| Paginación  | `?profile-paginator-page=N`                                                                                                                                                                                                                 |
| Teléfono    | **HTML** — `a.js-phone[href^="tel:"]`, WhatsApp via `.icon-whatsapp`                                                                                                                                                                        |
| Tarifas     | **HTML** ✅ — `.rates table tbody tr`, primary + EUR conversion                                                                                                                                                                             |
| Servicios   | **HTML** ✅ — `.services table tbody tr`, included/extra columns                                                                                                                                                                            |
| Reviews     | **HTML** ✅ — `.reviews #reviews-content .item`                                                                                                                                                                                             |
| Params      | `.params > div` pares label/value — slugs de city/country desde `<a href>`                                                                                                                                                                  |
| Mapa        | `#incall-map[data-lat][data-lng]` — lat/lng del incall                                                                                                                                                                                      |
| Login       | No                                                                                                                                                                                                                                          |
| v2 adapter  | `src/infrastructure/adapters/sources/dating/eurogirlsescort/` — 105 tests                                                                                                                                                                   |
| Nota        | `attributes: {}` vacío en mapper — servicios extraídos en extractor pero **no mapeados** a canonical (gap conocido). Teléfono: `a.js-phone[href^="tel:"]`, sin WhatsApp detectado en fixture (`icon-whatsapp` apunta a dmca.com, no es WA). |

---

## gemidos.tv ✅ v2

> WordPress: **No** (verificado 20/05/2026).
> Listado real: `https://gemidos.tv/espana-comunidad-de-madrid`
> Profile URL real: `/{slug}` un solo segmento, con o SIN id numérico
> (cards `<a class="listing-link">` en `.listing-pub`).
> 20/05/2026 (real): `https://gemidos.tv/anitta-brasil` · `https://gemidos.tv/pau-535603`
>
> **Estructura detallada del perfil → [gemidos/GEMIDOS.md](gemidos/GEMIDOS.md)**

Example URL: `https://gemidos.tv/pau-535603` (Real)

| Campo       | Valor                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| Tech        | Desconocida (CF WAF protected)                                                                                  |
| Render      | **CF** — Cloudflare WAF — Playwright + CF bypass necesario                                                      |
| Listing     | `/espana`, `/{city}`, etc.                                                                                      |
| Profile URL | `/anuncio/{slug}/` — slug es sourceId                                                                           |
| Paginación  | `a[rel="next"]`                                                                                                 |
| Título      | `.pub-title` (puede contener emojis)                                                                            |
| Nickname    | Primer \w+ del título (strip emoji)                                                                             |
| Descripción | `.pub-about-full`                                                                                               |
| Ciudad      | ❌ — no disponible en HTML estático                                                                             |
| Teléfono    | **HTML** — `.pub-phone span` (texto plano, no href)                                                             |
| Tarifas     | ❌ — no disponible                                                                                              |
| Servicios   | ✅ `GemidosService{slug,label,category}` — 6 grupos: `services/oral/fantasy/massage/online/extra` via clase CSS |
| Ubicación   | ✅ `.pub-location-tag` → `locationTags` · `.pub-map-label strong` → `address` · inferido `meetingPlaces`        |
| Imágenes    | `.pub-picture img, .pub-book-item img, .story img` · fallback `og:image`                                        |
| Verificada  | `.badge-verified, .fa-shield-check`                                                                             |
| Tags datos  | `.pub-tags-item.number` → `Años`/`CM`/`KG` · `.pub-tags-item small` → labels                                    |
| Login       | No                                                                                                              |
| País        | ES                                                                                                              |
| Nota        | CF WAF — Playwright con bypass necesario para acceder a perfiles                                                |

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
| Precio rango | `p.rango.css_escort img[src]` → `perfil-N.png` → 1–5                                               |
| Login        | No                                                                                                 |
| v2 adapter   | `src/infrastructure/adapters/sources/dating/girlsbcn/` — tipos + parsers + extractor + mapper      |

---

## girlsmadrid.com ✅ v2

Example URL: `https://www.girlsmadrid.com/escort-lucia167.html` (Real)

| Campo        | Valor                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| Tech         | PHP SSR — mismo backend gbcnmedia que GirlsBCN, HTML template distinto                                        |
| Render       | SSR                                                                                                           |
| Profile URL  | `/{slug}.html`                                                                                                |
| Título       | `.heading h1` — ALL-CAPS → title case en extractor                                                            |
| Teléfono     | `div.telefono a[href^="tel:"]`                                                                                |
| WhatsApp     | `a[href*="wa.me"]`                                                                                            |
| Ciudad       | Hardcodeada `'Madrid'` (no presente en HTML)                                                                  |
| Atributos    | `ul.meta-post li label/span` — mismos campos que GirlsBCN                                                     |
| Imágenes     | `.foto.media-box .media-box-image img` — `data-src` primero, luego `src`                                      |
| Encuentros   | `.widget .tags li` → `meetingPlaces[]`                                                                        |
| Precio rango | `.widget h4:contains("tarifas") ~ img[src]` → `perfil-N.png` → 1–5                                            |
| Login        | No                                                                                                            |
| v2 adapter   | `src/infrastructure/adapters/sources/dating/girlsmadrid/` — extractor + mapper (tipos y parsers de girlsbcn/) |

---

## hotvalencia.com ✅ v2

> WordPress + Elementor + JetEngine. WP REST verificado 21/05/2026: CPT de perfiles **no expuesto** en `/wp-json/wp/v2/types`. JetEngine sólo expone listing templates. Perfiles detrás de login — WP REST no viable.

Example URL: `https://hotvalencia.com/putas-valencia/valentina-escortvalencia/` (Fixture)

| Campo       | Valor                                                                       |
| ----------- | --------------------------------------------------------------------------- |
| Tech        | WordPress + Elementor + JetEngine (custom post types)                       |
| Render      | SSR (perfiles), JS (listing members-only)                                   |
| Listing     | **LOGIN requerido** — miembros únicamente                                   |
| Profile URL | `/putas-valencia/{slug}/`                                                   |
| sourceId    | último segmento de la URL                                                   |
| Nickname    | primera palabra del `h1` (`.entry-title`, `.elementor-heading-title`, `h1`) |
| Bio         | `.elementor-text-editor`, `.entry-content p`                                |
| Teléfono    | `a[href^="tel:"]` → 9 dígitos                                               |
| WhatsApp    | ❌ no detectado                                                             |
| Imágenes    | `.elementor-image img, .wp-post-image` → `src`; fallback `og:image`         |
| Vídeo       | `video` element → `hasVideo = true` → `statistics.videoCount = 1`           |
| Ciudad      | ❌ no extraíble sin login                                                   |
| Servicios   | ❌ stub                                                                     |
| Login       | Sí — listing inasequible; perfiles accesibles directamente                  |
| Confidence  | `low` (0.5) — listing requiere login                                        |
| v2 adapter  | `src/infrastructure/adapters/sources/dating/hotvalencia/`                   |

---

## loquosex.com ✅ v2

> WordPress: **Sí** (imágenes en `wp-content/uploads/products_img/`, verificado 22/05/2026). Operativo de nuevo 22/05/2026 tras caída 20-21/05 (502 del origen, no bloqueo anti-bot).

Example URL: `https://www.loquosex.com/ven-a-conocerme-no-te-vas-a-arrepentir-677684329.html/` (Real)

| Campo       | Valor                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Tech        | WordPress (PHP)                                                               |
| Render      | SSR                                                                           |
| Listing     | TBD                                                                           |
| Profile URL | `*.html` (excluye `/page/`)                                                   |
| Paginación  | `a.nextpostslink`                                                             |
| Teléfono    | `.numero-telefono` + fallback `a[href^="tel:"]`                               |
| WhatsApp    | `a[href*="api.whatsapp.com"]` → `?phone=` param; fallback `a[href*="wa.me"]`  |
| sourceId    | 9-digit phone from URL slug                                                   |
| Ciudad      | `ul[class^="caracteristicas-detalle"]` → Localidad links (3rd breadcrumb)     |
| Servicios   | `ul[class^="si-no-"]` icons zip `ul[class^="servicios-"]` names (included=SI) |
| Imágenes    | `section.caja-fotos li.photo_list img` — strip `?v=` query, deduplicate       |
| isPremium   | `.cabecera-titulo` text contains "premium"                                    |
| Login       | No                                                                            |

---

## madrid69.com ✅ v2

> WordPress: **No** — Next.js (verificado 20/05/2026).

Example URL: `https://www.madrid69.com/citas-chicas-madrid-44064-thalia-pura-ternura-644417235` (Real)

| Campo       | Valor                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Tech        | Next.js (CSR) + Laravel backend (`api.madrid69.com`)                                                                           |
| Render      | JS — body is empty; data in SSR `<head>` meta tags + Playwright-intercepted API response                                       |
| Listing     | `/citas/{city}` — paginación via API (pendiente)                                                                               |
| Profile URL | `/citas-chicas-{city}-{id}-{name}-{phone}` (old) · `/citas/{city}/{slug}` (new)                                                |
| sourceId    | Numeric ID from URL slug (e.g. `44064`)                                                                                        |
| Teléfono    | From `<title>` "tel: XXXXXXXXX" pattern (head) · `telefono` field (API)                                                        |
| WhatsApp    | `whatsapp` field from API (normalized to 9 digits)                                                                             |
| Nickname    | First word of `<title>` before comma (head) · `nombre` (API)                                                                   |
| Bio         | `<meta name="description">` (head) · `descripcion` (API)                                                                       |
| Ciudad      | URL slug segment (head) · `ciudad` (API)                                                                                       |
| Imágenes    | `<link rel="preload" as="image">` with `madrid69.b-cdn.net/image/` (head) · `fotos[].ruta` → `api.madrid69.com/storage/` (API) |
| Datos ricos | `edad`, `altura`, `peso`, `nacionalidad`, `idiomas`, `servicios` — solo vía API                                                |
| API interc. | Playwright intercepta `api.madrid69.com` responses (filtro: status 200, JSON con `nombre`/`id`)                                |
| Login       | No                                                                                                                             |
| Confidence  | `medium` (0.8) si API disponible (tiene edad/nacionalidad) · `low` (0.5) si solo head                                          |
| v2 adapter  | `src/infrastructure/adapters/sources/dating/madrid69/`                                                                         |

---

## milescorts.es ✅ v2

Example URL: `https://www.milescorts.es/escorts-y-putas/madrid-ciudad/631594827-escort-sexy-396681.htm` (Real)

| Campo       | Valor                                                                    |
| ----------- | ------------------------------------------------------------------------ |
| Tech        | Bootstrap 3 + PHP                                                        |
| Render      | SSR                                                                      |
| Listing     | `/escorts-y-putas/{city}`                                                |
| Profile URL | `/escorts-y-putas/{city}/{phone}-{slug}-{id}.htm`                        |
| Paginación  | `?page=N`                                                                |
| sourceId    | Last numeric segment of filename (`\d+\.htm$`)                           |
| Teléfono    | **URL** — first `\d{9,}` segment of filename; fallback `a[href^="tel:"]` |
| WhatsApp    | `a[href*="wa.me"]` or `a[href*="api.whatsapp.com"]`                      |
| Ciudad      | **URL** — penultimate path segment (replace `-` → ` `)                   |
| Imágenes    | `#fotos-anuncio img` — prefer `data-original` (lazy), fallback `src`     |
| Verificada  | `a.btn-success[href*="fotos-reales"]` or `.label-success:Verificada`     |
| Tarifas     | ❌ not in HTML                                                           |
| Servicios   | ❌ not in HTML                                                           |
| Login       | No                                                                       |

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

> WordPress: **Sí** (`/wp-content/` detectado 20/05/2026). WP REST verificado 21/05/2026: CPT `anuncios` **no expuesto** en `/wp-json/wp/v2/`. Discovery vía Playwright + networkidle (listing AJAX) es la única opción.

Example URL: `https://mislios.com/escorts/valencia/amber-38203/` (Real)

| Campo       | Valor                                                             |
| ----------- | ----------------------------------------------------------------- |
| Tech        | WordPress + plugin propio "mislios" (SSR perfiles)                |
| Render      | SSR — perfiles individuales SSR · listing AJAX                    |
| Listing     | `/escorts/` — listing AJAX, Playwright networkidle para discovery |
| Profile URL | `/escorts/{ciudad}/{slug}-{id}/` — último segmento es sourceId    |
| Paginación  | N/A (listing AJAX)                                                |
| Título      | `h1` · fallback `.msl-profile-name`                               |
| Descripción | `.msl-profile-desc` · fallback `.profile-text`                    |
| Ciudad      | ❌ — no disponible en HTML estático                               |
| Teléfono    | **HTML** — `a[href^="tel:"]`                                      |
| WhatsApp    | ❌ — no detectado                                                 |
| Tarifas     | ❌ — no disponible                                                |
| Servicios   | ❌ — no disponible                                                |
| Imágenes    | `.msl-gallery img` (`src` o `data-src`) · fallback `og:image`     |
| Login       | No                                                                |
| País        | ES (España — fuente exclusivamente española)                      |
| Nota        | Edad/Nacionalidad/Ciudad no en HTML estático de perfil            |

---

## nuevoloquo.ch / .com / .es ✅ v2

> WordPress: **No** (verificado 20/05/2026).

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

| v2 adapter | `src/infrastructure/adapters/sources/dating/nuevoloquo/` — 57 tests |

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

## topescortbabes.com ✅ v2

> WordPress: **No** — `window.profileData` JS object en `<script>` (verificado con HTML real).
> Estructura detallada: `topescortbabes.types.ts` (700+ líneas de tipos inferidos de 51 JSON reales).
> Fixtures: `lera.html` (lera, sin precios, vip) · `luna.html` (luna, con precios, vip).

Example URL: `https://topescortbabes.com/barcelona/escorts/Lera_4091523` (Real)

| Campo            | Valor                                                                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Tech             | SPA — `window.profileData = {…};` en `<script>` (JSON-compatible JS literal, no `__NEXT_DATA__`)                                                |
| Render           | **CF** — Cloudflare WAF — Playwright + bypass necesario                                                                                         |
| Listing          | `/{country}/escorts` · `/{city}/escorts`                                                                                                        |
| Profile URL      | `/{city}/escorts/{Slug_numericId}` — sourceId = parte numérica del slug final                                                                   |
| Paginación       | TBD (listing post-CF)                                                                                                                           |
| Título/Nickname  | `payload.nickname`                                                                                                                              |
| Teléfono         | `payload.phoneNumber` — `null` en fixtures (no disponible en HTML estático)                                                                     |
| Teléfono encoded | `payload.encodedPhoneNumber` — cadena ofuscada (requiere decode del lado cliente)                                                               |
| Telegram encoded | `payload.encodedTelegram` — cadena ofuscada                                                                                                     |
| WhatsApp         | `contactOptions` incluye `"Whatsapp"` → `whatsapp` in `contactOptions[]`                                                                        |
| Contactos        | `payload.contactOptions[]` — ej. `["Whatsapp","SMS","Telegram"]` · `["Whatsapp","Telegram"]`                                                    |
| Precio mínimo    | `payload.minimumPrice` — "from 120 €" (ausente si sin precios)                                                                                  |
| Tarifas          | `payload.prices[]` — `{label:"1 hour", price:"120", currency:"EUR"}` · vacío si no declarado                                                    |
| Verificada       | `payload.badges.verified` · `.vip` · `.trans` · `.pornstar`                                                                                     |
| Edad             | `payload.personalDetails.age` (HtmlString con `<a>`) → parseado a número                                                                        |
| Altura/Peso      | `payload.personalDetails.height/weight` (HtmlString "177cm / 5'10\"") → regex                                                                   |
| Nacionalidad     | `payload.personalDetails.nationality` (HtmlString con `<a>`) → strip tags                                                                       |
| Idiomas          | `payload.spokenLanguage` (string CSV)                                                                                                           |
| Ciudad base      | `payload.baseCity.name` + `.url_segment`                                                                                                        |
| Ciudad actual    | `payload.currentCity.name` + `.url_segment`                                                                                                     |
| Bio              | `payload.aboutMe.content` (HTML) · `original` + `original_language`                                                                             |
| Servicios        | ❌ — no hay campo `services[]` en profileData; `serviceText` es texto libre                                                                     |
| Imágenes         | `payload.photos[].path` + `.thumbnail` + `.verification_level`                                                                                  |
| Reviews          | `payload.reviews[]` completo con sub-ratings (place/punctuality/looks/attitude/services/photos)                                                 |
| reviewsCount     | `payload.reviewsCount`                                                                                                                          |
| reviewsRating    | `payload.reviewsRating`                                                                                                                         |
| Tours            | `payload.tours[]` — ciudades + fechas (array vacío si sin tours)                                                                                |
| Schema.org       | `payload.pageSchema["@graph"]` — Person, Organization, Service, Offer, ProfilePage, FAQ                                                         |
| Login            | No                                                                                                                                              |
| País             | ES / Internacional                                                                                                                              |
| v2 adapter       | `src/infrastructure/adapters/sources/dating/topescortbabes/` — 105 tests (51 JSON + 2 HTML)                                                     |
| Nota             | `attributes: {}` vacío en mapper (servicios no mapeados — gap conocido). `encodedPhoneNumber` y `encodedTelegram` pasan a canonical via mapper. |

---

## Resumen por estado

### v2 adapter completo ✅ (20 / 20)

SSR / fácil:

- **ardienteplacer.com** — teléfono en modal estático HTML, tarifa, edad, nacionalidad, WhatsApp, 57 tests
- **destacamos.net** — teléfono en DOM, isPremium, altura, 56 tests
- **erosguia.com** — SSR Laravel, dual panel data-position, call≠WA phone, telegram, 82 tests
- **eurogirlsescort.es/com** — SSR, tarifas + servicios + reviews, 105 tests (servicios extraídos pero no en `attributes` — gap conocido)
- **girlsbcn.net** — SSR PHP, atributos dl-horizontal, WA, video, rango precio — shared types+parsers+mapper
- **girlsmadrid.com** — SSR PHP, template diferente, ciudad hardcoded, usa tipos/mapper de girlsbcn
- **loquosex.com** — SSR, teléfono + servicios, 75 tests
- **milescorts.es** — SSR, teléfono + ciudad desde URL, 54 tests
- **nuevapasion.com** — SSR PHP, phone tel:, og:image fallback, 33 tests
- **nuevoloquo.ch/com/es** — SSR, detalle completo, sin teléfono (Playwright), 57 tests

Playwright-render (age gate / JS-render / login):

- **bluemove.es** — Playwright para age gate + listing discovery
- **chicasmalas.es** — Playwright-rendered Elementor; age gate + cookies click required, 53 tests
- **citapasion.com** — listing AJAX — Playwright para discovery
- **hotvalencia.com** — listing members-only (login); profiles accesibles directos, 30 tests
- **madrid69.com** — CSR Next.js; SSR head + Playwright API interception, 74 tests
- **milpasiones.com** — head SSR; body JS no necesario para key data, 36 tests
- **mislios.com** — listing AJAX — Playwright para discovery

Cloudflare WAF (Playwright + bypass):

- **escort-advisor.xxx** — CF WAF
- **gemidos.tv** — CF WAF
- **topescortbabes.com** — CF + `window.profileData` JS literal, precios/reviews/badges/encodedPhone, 105 tests (51 JSON + 2 HTML)

## mundosexanuncio.com ✅ v2

> WordPress: **No** — PHP SSR (verificado 20/05/2026).
> Listado real: `https://www.mundosexanuncio.com/contactos-mujeres-en-madrid-provincia`
> 20/05/2026 (real): `https://www.mundosexanuncio.com/contactos-mujeres/antonella-coslada-video-de-presentacion-99065186` · `https://www.mundosexanuncio.com/contactos-mujeres/sofia-rubia-muy-sexy-paraguaya-cachonda-99537024`

| Campo       | Valor                                                              |
| ----------- | ------------------------------------------------------------------ |
| Tech        | PHP SSR                                                            |
| Listing     | `/contactos-mujeres-en-{zona}`                                     |
| Profile URL | `/contactos-mujeres/{slug}-{id}` — sourceId = id numérico final    |
| Anuncio     | `section .main` — `.title`, `.a_content` (bio)                     |
| Datos       | `.details[data-city]` · `.addr` (zona) · texto libre               |
| Edad        | inferida del texto del bio (no hay campo estructurado)             |
| Teléfono    | `.fa_tel a[href^="tel:"]` (href usa `tel://` doble barra) · **fallback mejor: JSON-LD Person `"telephone"` field** |
| WhatsApp    | `a[href*="api.whatsapp.com"]` — número visible en texto del enlace |
| JSON-LD     | **Person** con `telephone`, `name`, `description`, `address{addressLocality, addressRegion, streetAddress}`, `image{url,width,height}` — fuente más fiable que DOM |
| Imágenes    | `#images img[data-src]` · fallback JSON-LD Person `image.url`      |
| Login       | No                                                                 |

---

## valenciacitas.com ✅ v2

> WordPress: **No** — Next.js + Bunny Shield (verificado 20/05/2026).
> Clon de madrid69.com: misma plataforma white-label, mismo backend
> `api-prod.valenciacitas.com`, mismo HTML. El adaptador reutiliza el
> extractor y el mapper de madrid69 (`ValenciacitasPipeline extends
Madrid69Pipeline`, solo cambia dominio y `source`).

| Campo       | Valor                                             |
| ----------- | ------------------------------------------------- |
| Tech        | Next.js (App Router, RSC) · Bunny Shield anti-bot |
| Proxy       | zyte (requiere proxy por Bunny Shield)            |
| Listing     | `/` (home CSR)                                    |
| Profile URL | `/citas-chicas-{ciudad}-{id}-{slug}-{phone}`      |
| Edad        | `<span>Edad: NN</span>` en el DOM renderizado     |
| Login       | No                                                |

---

### Pendiente de añadir adapador

- **zukery.com**
