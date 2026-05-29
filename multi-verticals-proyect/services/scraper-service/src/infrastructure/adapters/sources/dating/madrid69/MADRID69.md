# madrid69.com — Estructura del perfil

> Fixture sintético `kheila_44064.html`. Next.js CSR + Laravel API backend.
> Datos en SSR `<head>` + Playwright API interception.

---

## Tech

- **Render**: JS (Next.js CSR). Body vacío en SSR. Data en `<head>` meta tags + API response.
- **Backend**: Laravel (`api.madrid69.com`).
- **CDN imágenes**: `madrid69.b-cdn.net/image/` (también para clones tipo valenciacitas).
- **URL perfil** (formato viejo): `/citas-chicas-{city}-{id}-{name}-{phone}`.
- **URL perfil** (formato nuevo): `/citas/{city}/{slug}`.

---

## Identificación (desde URL/head)

| Campo       | Origen                                          | Estado |
| ----------- | ----------------------------------------------- | ------ |
| `sourceId`  | ID numérico del slug (ej. `44064`)              | ✅     |
| `city`      | segmento URL                                    | ✅     |
| `nickname`  | primera palabra del `<title>` antes de coma     | ✅     |

---

## Estrategia dual: HEAD + API

```ts
extractMadrid69(html, sourceUrl, apiJson?)
```

Si `apiJson` está disponible (capturado por Playwright vía network interception), enriquece con campos estructurados. Si no, solo head.

### Fuente HEAD (siempre)

```html
<title>Kheila, 19, Madrid - tel: 644417235 | Madrid69</title>
<meta name="description" content="Bio…" />
<meta property="og:title" content="Kheila…" />
<meta property="og:description" content="…" />
<meta property="og:image" content="https://madrid69.b-cdn.net/image/…" />
<link rel="preload" as="image" href="https://madrid69.b-cdn.net/image/foto1.jpg" />
```

| Campo       | Selector                                                                           | Estado |
| ----------- | ---------------------------------------------------------------------------------- | ------ |
| `title`     | `<title>` · fallback `meta[property="og:title"]`                                   | ✅     |
| `bio`       | `meta[name="description"]` · fallback `og:description`                             | ✅     |
| `phone`     | `<title>` regex `tel:\s*(\d{9})`                                                   | ✅     |
| `nickname`  | parsed del title (primera palabra)                                                 | ✅     |
| `photos[]`  | `link[rel="preload"][as="image"][href*=".b-cdn.net/image/"]` · fallback `og:image` | ✅     |
| `age`       | `body` text regex `Edad:\s*(\d{2})` (si renderizado por JS)                        | ✅     |

### Fuente API (cuando disponible vía Playwright)

`apiJson` es la respuesta interceptada de `api.madrid69.com`. Parsing: `parseMadrid69ApiProfile(apiJson)`.

| Campo           | Origen API                                  | Estado |
| --------------- | ------------------------------------------- | ------ |
| `nombre`        | nickname                                    | ✅     |
| `telefono`      | phone                                       | ✅     |
| `whatsapp`      | normalizado 9 dígitos                       | ✅     |
| `descripcion`   | bio                                         | ✅     |
| `ciudad`        | city                                        | ✅     |
| `edad/altura/peso/nacionalidad/idiomas/servicios` | datos ricos       | ✅     |
| `fotos[].ruta`  | URLs vía `api.madrid69.com/storage/`        | ✅     |

---

## API interception (Playwright)

```ts
page.on('response', async (res) => {
  if (
    res.url().startsWith('https://api.madrid69.com') &&
    res.status() === 200 &&
    res.headers()['content-type']?.includes('json')
  ) {
    const json = await res.json();
    if (json.nombre || json.id) apiJson = json;
  }
});
```

Filtro: status 200, content-type JSON, contiene `nombre` o `id`.

---

## Confidence

| Caso                         | Confidence    |
| ---------------------------- | ------------- |
| API disponible (edad+nac.)   | `medium` (0.8)|
| Solo head                    | `low` (0.5)   |

---

## Notas técnicas

- **Cuerpo vacío en SSR**: el HTML inicial no tiene contenido. Todo en head meta + JS-render + API.
- **CDN photos en `preload`**: trick para extraer URLs sin renderizar.
- **Clone de valenciacitas** usa mismo extractor (cambia solo dominio).
- 74 tests.
