# CLAUDE.md — apps/web

> Frontend web de Allcoba.
> Stack: Next.js 15 App Router + TypeScript + Tailwind v4
> Lee también el CLAUDE.md raíz y las skills en .agents/skills/ antes de trabajar aquí.

---

## Qué es este proceso

Frontend web construido con **Next.js 15 App Router**. Se despliega inicialmente
en Vercel free tier — migrable a Hetzner + Docker sin cambios de código.

**Principio:** un solo componente React para cada pieza de UI, usado tanto en
Server Components (SSG/SSR, sin JS al cliente) como en Client Components
(interactividad). Sin doble implementación de componentes.

```typescript
// El MISMO componente en dos contextos — sin duplicar código
// Server Component (SSG — ficha pública, sin JS al cliente)
<ProviderCard provider={provider} />

// Client Component (deck de swipe — con interactividad)
'use client'
<ProviderCard provider={provider} onSwipe={handleSwipe} />
```

---

## Estructura de carpetas

```
apps/web/
├── app/                              ← App Router — rutas del proyecto
│   ├── layout.tsx                    ← layout raíz (fuentes, providers globales)
│   ├── page.tsx                      ← landing pública
│   ├── (auth)/                       ← grupo de rutas de autenticación
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/                        ← grupo de rutas autenticadas
│   │   ├── layout.tsx                ← layout con NavBar autenticada
│   │   ├── discovery/page.tsx        ← deck de swipe (dating)
│   │   ├── saved/page.tsx            ← perfiles guardados
│   │   ├── appointments/page.tsx     ← mis citas
│   │   ├── messages/page.tsx         ← conversaciones
│   │   └── profile/page.tsx          ← mi perfil
│   ├── [vertical]/                   ← verticales de servicios (SSR)
│   │   ├── page.tsx                  ← búsqueda de la vertical
│   │   └── [slug]/                   ← ficha pública del Presenter (SSG)
│   │       └── page.tsx
│   └── api/                          ← API routes (webhooks, revalidación)
│       └── revalidate/route.ts       ← revalidar ficha de Presenter
├── components/
│   ├── ui/                           ← componentes base (Button, Input, Card...)
│   │   └── ...                       ← shadcn/ui como base, customizados
│   ├── providers/                    ← Provider, VerticalCard, ServiceCard...
│   ├── layout/                       ← NavBar, Footer, Sidebar
│   ├── discovery/                    ← DeckView, SwipeCard, MapView
│   ├── appointments/                 ← CalendarView, SlotPicker, AppointmentCard
│   └── shared/                       ← TrustScore, Avatar, Badge, Toast
├── lib/
│   ├── api-client.ts                 ← cliente HTTP al api-gateway
│   ├── auth.ts                       ← gestión de tokens en memoria
│   └── stores/                       ← Zustand stores globales
│       ├── auth.store.ts             ← usuario, token, sesión
│       ├── vertical.store.ts         ← vertical activa
│       └── notifications.store.ts   ← notificaciones no leídas
└── public/                           ← assets estáticos
```

---

## Server vs Client Components — cuándo usar cada uno

```typescript
// SERVER COMPONENT (por defecto — sin 'use client')
// → Sin JS al cliente
// → Puede hacer fetch directo al api-gateway
// → Para: páginas SSG/SSR, fichas públicas, layouts

// app/[vertical]/[slug]/page.tsx
export default async function ProviderPage({ params }) {
  const provider = await fetchProvider(params.slug)  // fetch en servidor
  return <ProviderProfile provider={provider} />     // cero JS al cliente
}

// CLIENT COMPONENT ('use client' en la primera línea)
// → Tiene estado, efectos, eventos
// → Para: deck de swipe, chat, formularios, mapa

// components/discovery/DeckView.tsx
'use client'
export function DeckView() {
  const [deck, setDeck] = useState<Provider[]>([])
  // ...
}
```

---

## Estado global — Zustand

El access token vive **solo en memoria** — nunca en localStorage.
Se pierde al recargar la página — el middleware de Next.js redirige al login.

```typescript
// lib/stores/auth.store.ts
import { create } from 'zustand'

interface AuthStore {
  user:        User | null
  accessToken: string | null   // EN MEMORIA — nunca persiste
  setAuth:     (user: User, token: string) => void
  logout:      () => void
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user:        null,
  accessToken: null,
  setAuth:     (user, accessToken) => set({ user, accessToken }),
  logout:      ()                  => set({ user: null, accessToken: null }),
}))
```

---

## Fetch al api-gateway

```typescript
// lib/api-client.ts

export async function apiClient<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = useAuthStore.getState().accessToken

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (res.status === 401) {
    // Token expirado → intentar refresh
    const refreshed = await refreshToken()
    if (!refreshed) {
      useAuthStore.getState().logout()
      redirect('/login')
    }
    return apiClient(path, options)  // reintentar
  }

  if (!res.ok) throw new ApiError(res.status, await res.json())
  return res.json()
}
```

---

## SEO — Server Components + metadata API

```typescript
// app/[vertical]/[slug]/page.tsx

export async function generateMetadata({ params }): Promise<Metadata> {
  const provider = await fetchProvider(params.slug)
  return {
    title:       `${provider.displayName} — Allcoba`,
    description: provider.bio,
    openGraph:   { images: [provider.media[0]?.url] },
  }
}

// Schema.org — JSON-LD en Server Component
export default async function ProviderPage({ params }) {
  const provider = await fetchProvider(params.slug)
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify(buildSchema(provider))
      }} />
      <ProviderProfile provider={provider} />
    </>
  )
}
```

---

## Revalidación de fichas (equivalente a ISR)

Cuando un Presenter actualiza su perfil, el backend llama a este endpoint:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'
import { NextRequest }    from 'next/server'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret')
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { slug, vertical } = await req.json()
  revalidatePath(`/${vertical}/${slug}`)

  return Response.json({ revalidated: true })
}
```

En self-hosted (Hetzner): funciona igual con una sola instancia.
Con múltiples instancias: añadir Redis como cache handler (cuando sea necesario).

---

## Middleware — protección de rutas

```typescript
// middleware.ts (en la raíz de apps/web/)
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/discovery', '/saved', '/appointments', '/messages', '/profile']
const AUTH_ONLY = ['/login', '/register']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('refresh_token')  // httpOnly cookie
  const path  = request.nextUrl.pathname

  const isProtected = PROTECTED.some(p => path.startsWith(p))
  const isAuthOnly  = AUTH_ONLY.some(p => path.startsWith(p))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isAuthOnly && token) {
    return NextResponse.redirect(new URL('/discovery', request.url))
  }

  return NextResponse.next()
}
```

---

## Deployment

```bash
# Desarrollo local
pnpm dev        # http://localhost:3001

# Build de producción
pnpm build
pnpm start      # next start — servidor Node.js

# Docker (self-hosted)
# next.config.ts: output: 'standalone'
docker build -t allcoba-web .
docker run -p 3001:3001 allcoba-web
```

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',     // imagen Docker optimizada
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname:  '*.r2.cloudflarestorage.com',  // imágenes desde R2
    }],
  },
}

export default config
```

---

## Variables de entorno

```env
NEXT_PUBLIC_API_URL=https://api.allcoba.com   # api-gateway público
NEXT_PUBLIC_MAP_STYLE=https://tiles.openfreemap.org/styles/liberty
REVALIDATE_SECRET=                             # para el endpoint de revalidación
```

---

## Dependencias principales

```json
{
  "dependencies": {
    "next": "15",
    "react": "19",
    "react-dom": "19",
    "zustand": "^5",
    "maplibre-gl": "^4",
    "react-map-gl": "^7",
    "zod": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "tailwindcss": "^4",
    "@playwright/test": "^1"
  }
}
```

Sin Firebase. Sin Auth0. Sin dependencias de Vercel en el código.
