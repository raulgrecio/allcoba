# milescorts.es — Estructura del perfil

> Fixture sintético `631594827_396681.html`. Bootstrap 3 + PHP SSR.
> URL embebe `phone` y `id` — fuente primaria.

---

## Tech

- **Render**: SSR PHP.
- **URL perfil**: `/escorts-y-putas/{city-slug}/{phone}-{slug}-{id}.htm`.
- **Listing**: `/escorts-y-putas/{city}` con `?page=N`.

---

## Identificación (desde URL)

| Campo       | Origen                                       | Estado |
| ----------- | -------------------------------------------- | ------ |
| `sourceId`  | último numérico del filename (`\d+\.htm$`)   | ✅     |
| `phone`     | primer `\d{9,}` del filename                 | ✅     |
| `city`      | penúltimo segmento (slug → nombre)           | ✅     |

> **URL es fuente primaria** — fallbacks DOM secundarios.

---

## Cabecera

```html
<h1 id="anuncio-titular">Escort Sexy 396681</h1>
<section class="datos-model">
  <p>Bio texto libre…</p>
</section>
```

| Campo      | Selector                                                  | Estado |
| ---------- | --------------------------------------------------------- | ------ |
| `title`    | `h1#anuncio-titular` · fallback `h1`                      | ✅     |
| `nickname` | parsed del título                                         | ✅     |
| `bio`      | `section.datos-model p:first-child`                       | ✅     |

---

## Datos personales (algunos perfiles)

```html
<ul>
  <li>Edad: 25</li>
  <li>Nacionalidad: Española</li>
</ul>
```

| Campo         | Selector                                              | Estado |
| ------------- | ----------------------------------------------------- | ------ |
| `age`         | `ul li` matchea `/edad/i` → strip `Edad:`             | ✅     |
| `nationality` | `ul li` matchea `/nacionalidad/i` → strip prefix      | ✅     |
| `city`        | desde URL slug                                        | ✅     |

---

## Contacto

```html
<a href="tel:631594827">Llamar</a>
<a href="https://wa.me/34631594827">WhatsApp</a>
```

| Campo      | Selector                                                                 | Estado |
| ---------- | ------------------------------------------------------------------------ | ------ |
| `phone`    | URL filename primer `\d{9,}` · fallback `a[href^="tel:"]` strip          | ✅     |
| `whatsapp` | `a[href*="api.whatsapp.com"]` · fallback `a[href*="wa.me"]`              | ✅     |

---

## Fotos

```html
<div id="fotos-anuncio">
  <img data-original="/fotos/full/01.jpg" src="placeholder.jpg" alt="foto 1" />
</div>
```

| Campo            | Selector                                                            | Estado |
| ---------------- | ------------------------------------------------------------------- | ------ |
| `photos[].src`   | `#fotos-anuncio img` — `data-original` (lazy) > `data-src` > `src`  | ✅     |
| `photos[].alt`   | `img[alt]`                                                          | ✅     |

---

## Verificación

```html
<a class="btn-success" href="…fotos-reales…">Verificada</a>
<!-- o -->
<span class="label-success">Verificada</span>
```

| Campo        | Selector                                                                                       | Estado |
| ------------ | ---------------------------------------------------------------------------------------------- | ------ |
| `isVerified` | `a.btn-success[href*="fotos-reales"], .label-success:contains("Verificada"|"verificada")`      | ✅     |

---

## ❌ No disponible

| Campo      | Razón                       |
| ---------- | --------------------------- |
| `prices`   | No en HTML                  |
| `services` | No en HTML                  |

---

## Notas técnicas

- **URL fuente primaria**: phone + city + id todos derivables del path sin tocar DOM.
- **Lazy loading imgs**: `data-original` (no `data-src` típico).
- 54 tests.
