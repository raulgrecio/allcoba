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

> **Pendiente:** mapeo de slugs a catálogo canónico. Recopilar slugs únicos scrapeando
> varios perfiles antes de diseñar el mapa definitivo.

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

| Campo    | Presencia           | Notas                 | Estado |
| -------- | ------------------- | --------------------- | ------ |
| WhatsApp | ❌ No visto en HTML | Posible en JS o modal | ❌     |
| Telegram | ❌ No visto         | —                     | ❌     |
| Email    | ❌ No visto         | —                     | ❌     |

---

## Precios / tarifas

| Campo    | Presencia   | Notas                                     | Estado |
| -------- | ----------- | ----------------------------------------- | ------ |
| `prices` | ❌ No visto | El sitio puede no mostrar tarifas en HTML | ❌     |

---

## Reviews / valoraciones

| Campo          | Presencia      | Notas            | Estado |
| -------------- | -------------- | ---------------- | ------ |
| `reviews`      | ⚠️ Desconocido | No analizado aún | ⚠️     |
| `reviewsCount` | ⚠️ Desconocido | —                | ⚠️     |

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
- **URLs de perfil**: `/anuncio/{slug}/` — slug es el `sourceId`.
- **URLs de listado**: `/escorts-en-{ciudad}/`, `/acompañantes-en-{ciudad}/`, etc.
- **Paginación**: selector `.pagination .next` o similar (pendiente confirmar).
- **Selectors dependientes de layout**: el extractor usa clases CSS directas. Si el sitio cambia estructura, los selectores fallarán silenciosamente (retornarán `undefined`). Revisar periódicamente con fixtures nuevos.
