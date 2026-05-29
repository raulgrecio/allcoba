# gemidos.tv — Estructura del perfil de anuncio

> Documento de descubrimiento progresivo. Actualizar con cada nuevo perfil que se
> analice. Los campos marcados ✅ están implementados, ⚠️ se presumen pero sin
> fixture confirmado, ❌ no encontrados aún.

---

## Identificación del perfil

| Campo       | HTML / selector                       | Valor ejemplo                  | Estado |
| ----------- | ------------------------------------- | ------------------------------ | ------ |
| `sourceId`  | Último segmento de `/anuncio/{slug}/` | `bruna-marques-stgo`           | ✅     |
| `sourceUrl` | URL completa de la página             | `https://gemidos.tv/anuncio/…` | ✅     |

---

## Cabecera

```html
<h1 class="pub-title">🔥 Lucia escort Madrid</h1>
<div class="pub-about-full">Bio larga del perfil…</div>
<div class="pub-phone"><span>633 445 566</span></div>
<span class="badge-verified">Verificada</span>
```

| Campo        | Selector                              | Notas                          | Estado |
| ------------ | ------------------------------------- | ------------------------------ | ------ |
| `title`      | `.pub-title`                          | Puede incluir emojis al inicio | ✅     |
| `nickname`   | Parser desde title (1.ª palabra)      | "🔥 Lucia escort…" → "Lucia"   | ✅     |
| `bio`        | `.pub-about-full`                     | Texto libre, puede ser largo   | ✅     |
| `phone`      | `.pub-phone span`                     | Texto plano, sin `tel:`        | ✅     |
| `isVerified` | `.badge-verified`, `.fa-shield-check` | Presencia del elemento         | ✅     |

---

## Características físicas y perfil

```html
<div class="pub-tags">
  <span class="pub-tags-item number">26<small>Años</small></span>
  <span class="pub-tags-item number">165<small>CM</small></span>
  <span class="pub-tags-item number">52<small>KG</small></span>
  <span class="pub-tags-item number">90-60-90</span>
  <span class="pub-tags-item">Colombiana<small>Nacionalidad</small></span>
  <span class="pub-tags-item">Morena<small>Piel</small></span>
</div>
```

| Campo             | Clase / patrón                                     | Notas                     | Estado |
| ----------------- | -------------------------------------------------- | ------------------------- | ------ |
| `age`             | `.pub-tags-item.number` + `/años/i`                | Número extraído del texto | ✅     |
| `heightCm`        | `.pub-tags-item.number` + `/cm/i`                  | Número extraído           | ✅     |
| `weightKg`        | `.pub-tags-item.number` + `/kg/i`                  | Número extraído           | ✅     |
| `measurements`    | `.pub-tags-item.number` + `/\d+-\d+-\d+/`          | Ej. "90-60-90"            | ✅     |
| `nationality`     | `.pub-tags-item` con `<small>Nacionalidad</small>` | Texto del nodo padre      | ✅     |
| `ethnicity`       | `.pub-tags-item` con `<small>Piel</small>`         | "Morena", "Latina", etc.  | ✅     |
| `orientation`     | ⚠️ Posible `<small>Orientación</small>`            | No visto aún              | ⚠️     |
| `gender`          | ⚠️ Posible badge o tag                             | No visto aún              | ⚠️     |
| `spokenLanguages` | ⚠️ Posible `<small>Idiomas</small>`                | No visto aún              | ⚠️     |

---

## Servicios

```html
<div class="pub-services" id="pub-services">
  <h3>Servicios</h3>
  <div class="pub-tags">
    <a href="servicio-gfe" class="pub-tags-item pub_services">GFE</a>
    <a href="servicio-besos" class="pub-tags-item pub_services">Besos</a>
    …
  </div>

  <h5>Tipo de Oral</h5>
  <div class="pub-tags">
    <a href="oral-69" class="pub-tags-item pub_services_oral">69</a>
    <a href="oral-garganta-profunda" class="pub-tags-item pub_services_oral">Garganta Profunda</a>
    …
  </div>

  <h5>Tipo de Fantasía</h5>
  <div class="pub-tags">
    <a href="fantasia-ama" class="pub-tags-item pub_services_fantasy">Ama</a>
    …
  </div>

  <h5>Tipo de Masaje</h5>
  <div class="pub-tags">
    <a href="masaje-erotico" class="pub-tags-item pub_services_massage">Erotico</a>
    …
  </div>

  <h5>Servicios Virtuales</h5>
  <div class="pub-tags">
    <a href="videollamada-videollamada" class="pub-tags-item pub_services_online">Videollamada</a>
  </div>

  <h5>Adicionales</h5>
  <div class="pub-tags">
    <a href="servicio-escorts-completo" class="pub-tags-item pub_services_extra"
      >Escorts Completo</a
    >
  </div>
</div>
```

Cada `<a>` tiene:

- `href` = slug canónico del servicio (ej. `servicio-gfe`, `oral-69`)
- texto visible = etiqueta legible (ej. `GFE`, `69`)
- clase CSS = categoría funcional

| Clase CSS              | Categoría en `GemidosService.category` | Estado |
| ---------------------- | -------------------------------------- | ------ |
| `pub_services`         | `services`                             | ✅     |
| `pub_services_oral`    | `oral`                                 | ✅     |
| `pub_services_fantasy` | `fantasy`                              | ✅     |
| `pub_services_massage` | `massage`                              | ✅     |
| `pub_services_online`  | `online`                               | ✅     |
| `pub_services_extra`   | `extra`                                | ✅     |

> **Nota sobre etiquetas:** el scraper de los fixtures tenía auto-traducción del navegador
> activa, por lo que las etiquetas visibles aparecen en inglés en los datos almacenados.
> Los **slugs** (`href`) son fiables — no se traducen. Las etiquetas canónicas se derivan
> del slug (ver catálogo abajo).
>
> **Artefacto conocido:** `<a href="oral-" class="pub_services_oral">i</a>` — enlace roto
> con slug vacío y etiqueta `i` (icono renderizado como texto). El extractor lo filtra:
> `slug.endsWith('-') || label.length <= 1`.

---

## Catálogo de slugs conocidos (1 perfil analizado — helena_negrini)

### `pub_services` → `services`

| Slug                          | Label canónico (ES)            |
| ----------------------------- | ------------------------------ |
| `servicio-acepta-tarjetas`    | Acepta tarjetas                |
| `servicio-besos`              | Besos                          |
| `servicio-besos-en-la-boca`   | Besos en la boca               |
| `servicio-body-massage`       | Body massage                   |
| `servicio-despedidas`         | Despedidas                     |
| `servicio-escorts-completo`   | Escorts completo               |
| `servicio-eyaculacion-cuerpo` | Eyaculación en cuerpo          |
| `servicio-eyaculacion-facial` | Eyaculación facial             |
| `servicio-eyaculacion-pechos` | Eyaculación en pechos          |
| `servicio-gfe`                | GFE                            |
| `servicio-lenceria`           | Lencería                       |
| `servicio-lenceria-especial`  | Lencería especial              |
| `servicio-oral-full`          | Oral full                      |
| `servicio-poses-varias`       | Poses varias                   |
| `servicio-show-de-baile`      | Show de baile                  |
| `servicio-solo-efectivo`      | Solo efectivo                  |
| `servicio-solo-hombres`       | Solo hombres                   |
| `servicio-streptease`         | Streptease                     |
| `servicio-sugar-baby`         | Sugar baby                     |
| `servicio-trios`              | Tríos                          |
| `servicio-viajes`             | Viajes                         |

### `pub_services_oral` → `oral`

| Slug                       | Label canónico (ES)            |
| -------------------------- | ------------------------------ |
| `oral-69`                  | 69                             |
| `oral-con-preservativo`    | Con preservativo               |
| `oral-depende-higiene`     | Depende de la higiene          |
| `oral-garganta-profunda`   | Garganta profunda              |
| `oral-sin-preservativo`    | Sin preservativo               |

### `pub_services_fantasy` → `fantasy`

| Slug                          | Label canónico (ES)            |
| ----------------------------- | ------------------------------ |
| `fantasia-adoracion-de-pies`  | Adoración de pies              |
| `fantasia-ama`                | Ama                            |
| `fantasia-cambio-de-roles`    | Cambio de roles                |
| `fantasia-disfraces`          | Disfraces                      |
| `fantasia-dominacion`         | Dominación                     |
| `fantasia-domina`             | Domina                         |
| `fantasia-fetiches`           | Fetiches                       |
| `fantasia-humillacion`        | Humillación                    |
| `fantasia-lenceria-especial`  | Lencería especial              |
| `fantasia-sometimiento`       | Sometimiento                   |
| `fantasia-sumisa`             | Sumisa                         |
| `fantasia-sumision`           | Sumisión                       |

### `pub_services_massage` → `massage`

| Slug                    | Label canónico (ES)            |
| ----------------------- | ------------------------------ |
| `masaje-profesional`    | Masaje profesional             |
| `masaje-relajantes`     | Masaje relajante               |
| `masaje-sensual`        | Masaje sensual                 |
| `masaje-tailandes`      | Masaje tailandés               |

### `pub_services_online` → `online`

| Slug                               | Label canónico (ES)            |
| ---------------------------------- | ------------------------------ |
| `videollamada-venta-de-contenido`  | Venta de contenido             |
| `videollamada-venta-packs-de-fotos`| Venta de packs de fotos        |
| `videollamada-videollamada`        | Videollamada                   |

### `pub_services_extra` → `extra`

> Los slugs de `extra` son un subconjunto de los de `services` — mismos slugs,
> categoría diferente indica "servicio adicional destacado".

---

## Ubicación

```html
<div class="absolute m-5 p-10 top">
  <h3 class="pub-map-label">Ubicación</h3>
  <ol class="pub-tags">
    <li class="pub-tags-item pub-location-tag">Encuentros</li>
    <li class="pub-tags-item pub-location-tag">Hoteles</li>
    <li class="pub-tags-item pub-location-tag">Encuentros Presenciales</li>
    <li class="pub-tags-item pub-location-tag">Encuentros Reales</li>
  </ol>
  <h5 class="pub-map-label">Me encuentro en <strong>Paseo de la castellana 193</strong></h5>
  <a href="https://www.google.com/maps/dir//Paseo de la castellana 193">Cómo Llegar</a>
  <a href="https://maps.google.com/maps?…&q=Paseo de la castellana 193…">Ver Mapa</a>
</div>
```

| Campo                   | Selector / origen                                             | Notas                               | Estado |
| ----------------------- | ------------------------------------------------------------- | ----------------------------------- | ------ |
| `locationTags`          | `.pub-location-tag`                                           | Lista de strings sin normalizar     | ✅     |
| `address`               | `.pub-map-label strong`                                       | Dirección libre (piso, calle, zona) | ✅     |
| `meetingPlaces.incall`  | Inferido: tags con `encuentro\|presencial\|real\|piso\|local` | ✅                                  |
| `meetingPlaces.outcall` | Inferido: tags con `hotel\|domicilio\|salida\|desplaz`        | ✅                                  |
| `baseCity`              | ❌ No presente como campo estructurado                        | Solo en URL o en title              | ❌     |
| `lat/lng`               | ⚠️ Posible en URL del mapa de Google                          | Necesita parsear query param `q=`   | ⚠️     |

---

## Fotos

```html
<div class="pub-picture">
  <img src="https://cdn.gemidos.tv/fotos/lucia_1.jpg" />
</div>
<!-- Fallback si no hay galería: -->
<meta property="og:image" content="https://cdn.gemidos.tv/og.jpg" />
```

| Campo       | Selector                                                             | Notas                    | Estado |
| ----------- | -------------------------------------------------------------------- | ------------------------ | ------ |
| `photos`    | `.pub-picture img`, `.pub-book-item img`, `.story img`, `.cover img` | Deduplicados por `src`   | ✅     |
| OG fallback | `meta[property="og:image"]`                                          | Si la galería está vacía | ✅     |

---

## Contacto adicional

```html
<!-- pub-menu: WhatsApp visible en el DOM como data-attribute -->
<div class="pub-menu">
  <button
    type="button"
    data-trigger="Whatsapp.send"
    data-whatsapp-text="*Hi Helena Negrini !* I saw your ad https://gemidos.tv/pub/1185249 …"
    data-whatsapp-phone="447340072935"
    class="btn btn-primary pub-menu-button"
  >
    <i class="fab fa-whatsapp"></i>
  </button>
</div>
```

| Campo        | Selector / atributo                                         | Notas                                   | Estado |
| ------------ | ----------------------------------------------------------- | --------------------------------------- | ------ |
| `whatsapp`   | `button[data-trigger="Whatsapp.send"]` → `data-whatsapp-phone` | Número sin formato, incluye prefijo país | ✅  |
| Telegram     | ❌ No visto                                                 | —                                       | ❌     |
| Email        | ❌ No visto                                                 | —                                       | ❌     |

---

## pub-info — Badges de estado y género

```html
<div class="pub-info">
  <ol class="pub-tags">
    <li class="pub-tags-item"><span class="badge badge-accent">Available</span></li>
    <li class="pub-tags-item"><span class="badge badge-accent">Female</span></li>
    <li class="pub-tags-item"><span class="badge badge-accent">Video calls</span></li>
  </ol>
</div>
```

| Campo          | Selector                                  | Notas                                           | Estado |
| -------------- | ----------------------------------------- | ----------------------------------------------- | ------ |
| `gender`       | `.pub-info .badge-accent` ∋ Female/Male   | Auto-traducido — usar slug de perfil como backup | ⚠️    |
| `available`    | `.pub-info .badge-accent` ∋ Available     | Presencia del badge                             | ⚠️     |
| `hasVideoCalls`| `.pub-info .badge-accent` ∋ "Video calls" | Redundante con `pub_services_online`            | ⚠️     |

> **Problema:** los badges de `.pub-info` están traducidos por el navegador si auto-translate
> está activo. Fiabilidad baja sin fixture en español confirmado.

---

## pub-hours — Horario de atención

```html
<div class="pub-hours">
  <h3 class="pub-hours-label">Working Hours</h3>
  <div class="pub-hours-list">
    <div class="pub-hours-time">FULL TIME</div>
  </div>
</div>
```

| Campo          | Selector              | Notas                                              | Estado |
| -------------- | --------------------- | -------------------------------------------------- | ------ |
| `workingHours` | `.pub-hours-time`     | Texto libre: "FULL TIME" o lista de franjas horarias | ✅   |

---

## pub-trips — Tours / desplazamientos

```html
<div class="pub-trips p-0 m-0" id="pub-trips"></div>
```

| Campo   | Presencia       | Notas                                     | Estado |
| ------- | --------------- | ----------------------------------------- | ------ |
| `tours` | ⚠️ Div vacío   | Existe el contenedor pero sin datos aún   | ⚠️     |

---

## Precios / tarifas

```html
<div class="pub-price p-0 m-0"></div>
```

| Campo    | Presencia   | Notas                                           | Estado |
| -------- | ----------- | ----------------------------------------------- | ------ |
| `prices` | ❌ Div vacío | El sitio no muestra precios en HTML (confirmado) | ❌     |

---

## Reviews / comentarios

```html
<div class="pub-comments" id="pub-comments">
  <div class="comment comment-published" data-comment_id="7457613" data-reply-count="0">
    <span class="comment-badge">Marco</span>
    <div class="mt-5 text-break">texto del comentario…</div>
  </div>
</div>
```

| Campo          | Selector                            | Notas                                        | Estado |
| -------------- | ----------------------------------- | -------------------------------------------- | ------ |
| `reviewsCount` | `#pub-comments [data-comment_id]`   | Contar elementos — 3 en fixture analizado    | ⚠️     |
| `reviewsRating`| ❌ No hay estrellas/puntuación      | Solo comentarios de texto, sin rating        | ❌     |
| `reviewsText`  | `.comment-published .text-break`    | Texto libre del comentario                   | ⚠️     |

---

## Badges adicionales

| Campo      | Presencia            | Notas               | Estado |
| ---------- | -------------------- | ------------------- | ------ |
| `trans`    | ⚠️ Posible badge CSS | No visto en fixture | ⚠️     |
| `vip`      | ⚠️ Posible badge CSS | —                   | ⚠️     |
| `pornstar` | ⚠️ Posible badge CSS | —                   | ⚠️     |

---

## Notas técnicas

- **WAF**: Cloudflare. Requiere bypass (Patchright). Confidence → `low` hasta verificar calidad real.
- **URLs de perfil**: `/anuncio/{slug}/` o `/pub/{id}/` — el `sourceId` es el slug final.
- **URLs de listado**: `/escorts-en-{ciudad}/`, `/acompañantes-en-{ciudad}/`, etc.
- **Paginación**: selector `.pagination .next` o similar (pendiente confirmar).
- **Auto-translate del navegador**: los fixtures de `__data/` fueron capturados con auto-translate activo → las etiquetas de servicios y badges aparecen en inglés. Los `href` (slugs) y `data-*` attributes no se traducen y son fiables.
- **Selectors dependientes de layout**: el extractor usa clases CSS directas. Si el sitio cambia estructura, los selectores fallarán silenciosamente (retornarán `undefined`). Revisar periódicamente con fixtures nuevos.
