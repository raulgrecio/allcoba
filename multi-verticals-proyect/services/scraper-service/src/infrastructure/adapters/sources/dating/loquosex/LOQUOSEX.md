# loquosex.com — Estructura del perfil

> Análisis sobre HTML real (fixture `677684329.html` 108KB).
> WordPress (PHP), imágenes en `/wp-content/uploads/products_img/`.

---

## Tech

- **WordPress**: Sí (verificado 22/05/2026).
- **Render**: SSR.
- **URL perfil**: `*.html` (excluye `/page/`). sourceId = primeros 9 dígitos del slug.
- **Paginación**: `a.nextpostslink`.
- **Estado**: operativo 22/05 tras caída 20-21/05 (502 origen, no anti-bot).

---

## Identificación

| Campo       | Origen                            | Estado |
| ----------- | --------------------------------- | ------ |
| `sourceId`  | 9 dígitos del slug URL            | ✅     |
| `nickname`  | derivado de `og:title` o `h1`     | ✅     |
| `isPremium` | `.cabecera-titulo` text "premium" | ✅     |

---

## Contacto

```html
<!-- Phone in DOM -->
<a href="tel:+34677684329">…</a>
<div class="numero-telefono">677684329</div>

<!-- WhatsApp (api.whatsapp.com format con texto pre-rellenado) -->
<a
  href="https://api.whatsapp.com/send?phone=34677684329&text=Hola, he visto tu anuncio en *https://www.loquosex.com* y quiero quedar contigo"
>
  WhatsApp
</a>
```

| Campo      | Selector / origen                                                             | Estado |
| ---------- | ----------------------------------------------------------------------------- | ------ |
| `phone`    | `.numero-telefono` · fallback `a[href^="tel:"]`                               | ✅     |
| `whatsapp` | `a[href*="api.whatsapp.com"]` → `?phone=` param · fallback `a[href*="wa.me"]` | ✅     |

---

## Características (caracteristicas-detalle)

```html
<ul class="caracteristicas-detalle">
  <li>
    Localidad:
    <a href="/zona/murcia">Murcia</a>
  </li>
  <!-- … -->
</ul>
```

Extractor: itera `<li>` y parsea por label.

| Label HTML  | Campo  | Notas                                       | Estado |
| ----------- | ------ | ------------------------------------------- | ------ |
| `Localidad` | `city` | 3.º link del breadcrumb dentro de la `<li>` | ✅     |

---

## Servicios (icon zip)

Dos arrays paralelos zip por índice: iconos (incluido/no) + nombres.

```html
<!-- Icons: SI = incluido, NO = no incluido -->
<ul class="si-no-1">
  <li class="si"></li>
  <li class="no"></li>
  …
</ul>

<!-- Names alineados al mismo índice -->
<ul class="servicios-1">
  <li>24h</li>
  <li>Masajes</li>
  <li>Fr Natural</li>
  <li>Lesbisco</li>
  <li>Sado BDSM</li>
</ul>
```

Extractor: `$('ul[class^="si-no-"]').toArray()` + `$('ul[class^="servicios-"]').toArray()` zip por índice.

| Campo        | Origen                                              | Estado |
| ------------ | --------------------------------------------------- | ------ |
| `services[]` | zip `si-no-*` con `servicios-*` con `included` flag | ✅     |

---

## Fotos

```html
<section class="caja-fotos">
  <li class="photo_list">
    <img
      src="https://www.loquosex.com/wp-content/uploads/products_img/1774428975_658867400.jpg?v=zac"
    />
  </li>
  <li class="photo_list_multiple">…</li>
</section>
```

| Campo      | Selector                                                                                                           | Estado |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | ------ |
| `photos[]` | `section.caja-fotos li.photo_list img, section.caja-fotos li.photo_list_multiple img` · strip `?v=…` query · dedup | ✅     |

> El `?v=zac` cache-buster en el src debe stripearse para deduplicación.

---

## Cabecera

```html
<div class="cabecera-titulo">… Premium …</div>
```

| Campo       | Origen                                     | Estado |
| ----------- | ------------------------------------------ | ------ |
| `isPremium` | `.cabecera-titulo` text contiene "premium" | ✅     |

---

## JSON-LD

Solo `WebPage` schema — sin Person útil.

---

## Notas técnicas

- **Img sin lazy-loading**: las fotos van en `src` directo (no `data-src`).
- **WA con texto**: el href de WhatsApp lleva un mensaje pre-rellenado por defecto del site.
- 75 tests.
