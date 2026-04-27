# CLAUDE.md — apps/web

> Contexto específico del frontend web.
> Lee también el CLAUDE.md raíz del proyecto antes de trabajar aquí.

---

## Qué es este proceso

Frontend web construido con **Astro 4 + React islands + Tailwind v4**. Se despliega en **Cloudflare Pages**. El objetivo principal es velocidad de carga y SEO — cada vertical tiene páginas indexables con Schema.org y URLs semánticas.

Principio: **cero JavaScript por defecto**. El JS sólo llega al navegador donde hay interacción real (mapa, filtros, contacto). El resto son páginas estáticas o SSR puro.

---

## Estructura de carpetas

```
apps/web/src/
├── pages/
│   ├── index.astro                     ← home: selección de vertical
│   ├── [vertical]/
│   │   ├── index.astro                 ← listado/búsqueda de la vertical (SSR)
│   │   └── [slug].astro                ← ficha de provider (SSG + ISR)
│   └── conversaciones/
│       └── [id].astro                  ← gestión de conversación (SSR, auth)
├── components/
│   ├── islands/                        ← componentes React con interactividad
│   │   ├── SearchBar.tsx               ← búsqueda con filtros dinámicos
│   │   ├── ProvidersMap.tsx            ← mapa MapLibre GL
│   │   ├── ContactForm.tsx             ← formulario de contacto anónimo
│   │   └── ConversationChat.tsx        ← chat en tiempo real (SSE polling)
│   ├── ui/                             ← componentes Astro sin JS
│   │   ├── ProviderCard.astro
│   │   ├── ServiceList.astro
│   │   ├── TrustScore.astro
│   │   └── AvailabilityBadge.astro
│   └── layout/
│       ├── BaseLayout.astro            ← head, meta, fonts
│       └── VerticalLayout.astro        ← layout específico por vertical
├── lib/
│   ├── api-client.ts                   ← cliente HTTP tipado para la API
│   ├── auth.ts                         ← gestión de sesión en el cliente
│   └── geo.ts                          ← geolocalización del usuario
└── styles/
    └── global.css                      ← variables Tailwind v4, tokens de diseño
```

---

## Reglas de rendering

### Cuándo usar SSG (estático)

Fichas de provider (`/peluquerias/madrid/salon-ana`). Se pre-generan en build y se revalidan cuando el provider actualiza su perfil (ISR via Cloudflare). Son las páginas más importantes para SEO.

```typescript
// [slug].astro
export const prerender = true  // SSG

export async function getStaticPaths() {
  const providers = await api.providers.getAllSlugs()
  return providers.map(p => ({ params: { vertical: p.vertical, slug: p.slug } }))
}
```

### Cuándo usar SSR

Páginas de búsqueda con filtros y ubicación. Los resultados dependen de la posición del usuario — no se pueden pre-generar.

```typescript
// [vertical]/index.astro
export const prerender = false  // SSR en Cloudflare Pages

const { vertical } = Astro.params
const { q, lat, lng, radius } = Astro.url.searchParams
const results = await api.search({ vertical, q, lat, lng, radius })
```

### Islands de React — sólo donde hay estado

```astro
---
// El componente Astro hace el fetch inicial (SSR, sin JS en cliente)
const initialProviders = await api.search(params)
---

<!-- El island React recibe los datos iniciales y gestiona interactividad -->
<SearchBar
  client:load
  initialResults={initialProviders}
  vertical={vertical}
/>

<!-- Componentes sin interacción: Astro puro, 0 JS enviado -->
<ProviderCard provider={provider} />
```

---

## SEO — obligatorio en cada vertical

Cada ficha de provider debe incluir Schema.org `LocalBusiness` (o el tipo específico de la vertical). Sin esto, no se mergea.

```astro
---
const schema = {
  '@context': 'https://schema.org',
  '@type': 'HairSalon',           // tipo específico de la vertical
  name: provider.displayName,
  address: {
    '@type': 'PostalAddress',
    streetAddress: provider.addressText,
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: provider.location.lat,
    longitude: provider.location.lng,
  },
  openingHours: formatOpeningHours(provider.availability),
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: provider.trustScore.overall,
    reviewCount: provider.reviewCount,
  },
}
---

<script type="application/ld+json" set:html={JSON.stringify(schema)} />
```

### URLs semánticas — estructura obligatoria

```
/peluquerias/                           ← listado vertical
/peluquerias/madrid/                    ← listado filtrado por ciudad
/peluquerias/madrid/salon-ana/          ← ficha de provider
/inmobiliaria/                          
/inmobiliaria/madrid/                   
/inmobiliaria/madrid/inmobiliaria-xyz/  
```

Nunca UUIDs en URLs públicas. El `slug` del provider es la URL.

---

## Mapa (MapLibre GL — sin licencia)

```typescript
// components/islands/ProvidersMap.tsx
import maplibregl from 'maplibre-gl'

// Tiles gratuitos: OpenStreetMap via protomaps o maptiler free tier
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'

// Los markers son SVG puros — sin dependencia de librería de markers
function createMarker(provider: PublicProvider): HTMLElement {
  const el = document.createElement('div')
  el.className = 'provider-marker'
  el.innerHTML = `<svg>...</svg>`
  return el
}
```

---

## Seguridad en el cliente

- El **access token JWT nunca va a localStorage** — se guarda en memoria (variable de módulo). Se pierde al cerrar la pestaña, lo que es correcto.
- El **refresh token está en cookie httpOnly** — el JS no puede leerlo ni robarlo.
- El cliente nunca almacena la DEK — sólo el servidor la tiene en memoria de sesión.

```typescript
// lib/auth.ts
let accessToken: string | null = null  // en memoria, no en localStorage

export function setAccessToken(token: string) { accessToken = token }
export function getAccessToken() { return accessToken }
export function clearSession() { accessToken = null }
```

---

## Core Web Vitals — umbrales mínimos

Estos valores se miden en CI con Lighthouse antes de cada deploy a producción:

| Métrica | Umbral |
|---------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| FID / INP | < 200ms |
| Total JS enviado (inicial) | < 100KB gzip |

---

## Variables de entorno

```env
PUBLIC_API_URL=https://api.tudominio.com
PUBLIC_MAP_STYLE=https://tiles.openfreemap.org/styles/liberty
```

Las variables con prefijo `PUBLIC_` son accesibles en el cliente. Las sin prefijo sólo en SSR. Nunca poner secretos en variables `PUBLIC_`.

---

## Comandos habituales

```bash
# Desarrollo local
npm run dev           # http://localhost:4321

# Build de producción
npm run build

# Preview del build
npm run preview

# Tests E2E con Playwright
npm run test:e2e

# Lighthouse CI
npm run lighthouse
```
