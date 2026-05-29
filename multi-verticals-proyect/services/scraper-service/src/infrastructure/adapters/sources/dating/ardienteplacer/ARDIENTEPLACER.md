# ardienteplacer.com — Estructura del perfil

> Fixture sintético `632277902_92010.html`. Selectores verificados con extractor (57 tests).
> Bootstrap 3 + PHP SSR.

---

## Tech

- **Render**: SSR (perfil y listing son páginas distintas).
- **URL perfil**: `/escort/{category}/{city}/{phone}/{id}` — sourceId = último segmento.
- **Listing**: `/escorts/{category}` con `?pagina=N`.
- **Age gate 18+**: `onBeforeCapture` — `button:contains("Soy mayor")`, `.btn-18`, `#acepto-18`.

---

## Identificación (desde URL)

| Campo       | Segmento URL                            | Estado |
| ----------- | --------------------------------------- | ------ |
| `sourceId`  | último (`{id}` numérico)                | ✅     |
| `phone` URL | penúltimo (9 dígitos)                   | ✅     |
| `city` URL  | antepenúltimo (fallback)                | ✅     |

---

## Cabecera

```html
<h3 id="info">Carmen - Escort independiente Madrid</h3>
<div style="word-break: break-word">
  Bio texto libre…
  <div class="toplistingblock">Recuerda mencionar que me encontraste…</div>
</div>
```

| Campo      | Selector                                                                          | Estado |
| ---------- | --------------------------------------------------------------------------------- | ------ |
| `title`    | `h3#info` · fallback `h1` split `' - '`                                           | ✅     |
| `nickname` | parsed desde título (primera palabra)                                             | ✅     |
| `bio`      | `div[style*="word-break: break-word"]` (strip `.toplistingblock` anidado)         | ✅     |

---

## Ciudad / Atributos

```html
<div class="postcatblock">Mujeres en Madrid (Madrid)</div>

<ul class="entry-meta">
  <li>28 años</li>
  <li>80 €/hora</li>
  <li>Española</li>
</ul>

<ul class="entry-meta">
  <img src="/images/flags/es.png" alt="De España" class="flag" />
</ul>
```

| Campo         | Selector / origen                                              | Estado |
| ------------- | -------------------------------------------------------------- | ------ |
| `city`        | `div.postcatblock` → regex `/en\s+(.+?)(?:\s*\(|$)/`           | ✅     |
| `age`         | `ul.entry-meta li, ul.listawidget li` matchea `^\d+\s+años$`   | ✅     |
| `rateRaw`     | mismo loop, matchea `\d+\s*€\/(hora|h)`                        | ✅     |
| `nationality` | `img[src*="/images/flags/"][alt]` strip `^De\s+`                | ✅     |

---

## Servicios

```html
<h5 class="titulo">Servicios</h5>
<ul class="list-unstyled">
  <li>Francés natural</li>
  <li>Masajes eróticos</li>
</ul>
```

| Campo        | Selector                                                                      | Estado |
| ------------ | ----------------------------------------------------------------------------- | ------ |
| `services[]` | `h5.titulo:contains("Servicios") + ul.list-unstyled li` · fallback heading scan | ✅   |

---

## Contacto

```html
<!-- Modal estático (revealed by JS click) -->
<div class="modal1">
  <div class="tel"><b>632277902</b></div>
  <a href="https://wa.me/34632277902?text=Hola" class="btn-whatsapp">WhatsApp</a>
</div>
```

| Campo      | Selector                                                              | Estado |
| ---------- | --------------------------------------------------------------------- | ------ |
| `phone`    | `.modal1 div.tel b` strip non-digits, last 9 · fallback URL 4.º seg.  | ✅     |
| `whatsapp` | `.modal1 a[href*="wa.me"]` · fallback `api.whatsapp.com` · `wa.me`    | ✅     |

> Phone está en HTML estático aunque el modal sea revealed-on-click — no requiere JS render.

---

## Fotos

```html
<a data-lightbox="fotos" href="/anuncios/92010/92010-1-g.jpg">
  <img src="/anuncios/92010/92010-1-m.jpg" alt="Carmen foto 1" />
</a>
```

| Campo            | Selector                                                                    | Estado |
| ---------------- | --------------------------------------------------------------------------- | ------ |
| `photos[].src`   | `a[data-lightbox][href^="/anuncios/"]` (excluir `-m.jpg`, `-s.jpg`)         | ✅     |
| `photos[].alt`   | `img[alt]` dentro del `<a>`                                                 | ✅     |
| URL absolute     | resolved contra `sourceUrl`                                                 | ✅     |

---

## Notas técnicas

- **Edad/Nacionalidad**: solo en listing card (`ul.entry-meta`), no en perfil detail por defecto — el extractor lo busca igualmente porque algunos perfiles lo incluyen.
- **Phone modal**: HTML estático (revealed via JS pero presente).
- 57 tests.
