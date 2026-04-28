# Skill: Next.js 15 App Router

Convenciones para escribir componentes, páginas y API routes en Next.js 15.
Lee este fichero antes de crear cualquier fichero en `apps/web/`.
Lee también `typescript/SKILL.md` antes de empezar.

---

## Regla fundamental — Server vs Client

Por defecto todo es Server Component. Añadir `'use client'` solo cuando sea necesario.

```
Server Component (sin 'use client'):
  ✓ fetch de datos al api-gateway
  ✓ acceso a variables de entorno del servidor
  ✓ páginas SSG y SSR
  ✓ layouts
  ✗ useState, useEffect, eventos del DOM
  ✗ Zustand stores
  ✗ MapLibre, librerías que usan window/document

Client Component ('use client' en la primera línea):
  ✓ useState, useEffect, eventos
  ✓ Zustand stores
  ✓ MapLibre y librerías del navegador
  ✗ fetch directo con secrets del servidor
```

---

## Estructura de rutas — App Router

```
app/
  layout.tsx              ← layout raíz — fuentes, providers, metadata base
  page.tsx                ← /  (landing pública — Server Component)
  (auth)/                 ← grupo sin segmento en la URL
    login/page.tsx        ← /login
    register/page.tsx     ← /register
  (app)/                  ← rutas autenticadas
    layout.tsx            ← layout con NavBar autenticada
    discovery/page.tsx    ← /discovery
  [vertical]/             ← segmento dinámico
    page.tsx              ← /masajes, /coches...
    [slug]/
      page.tsx            ← /masajes/oasis-wellness
  api/
    revalidate/route.ts   ← POST /api/revalidate
```

---

## Server Component — fetch de datos

```typescript
// app/[vertical]/[slug]/page.tsx

import type { Metadata } from 'next'

// Metadata dinámica
export async function generateMetadata(
  { params }: { params: Promise<{ vertical: string; slug: string }> }
): Promise<Metadata> {
  const { slug, vertical } = await params
  const provider = await fetchProvider(slug, vertical)
  return {
    title:       `${provider.displayName} — Allcoba`,
    description: provider.bio ?? undefined,
  }
}

// Pre-generar páginas en build (SSG)
export async function generateStaticParams() {
  const slugs = await fetchAllProviderSlugs()
  return slugs.map(({ vertical, slug }) => ({ vertical, slug }))
}

// La página — Server Component puro, sin JS al cliente
export default async function ProviderPage(
  { params }: { params: Promise<{ vertical: string; slug: string }> }
) {
  const { slug, vertical } = await params
  const provider = await fetchProvider(slug, vertical)
  return <ProviderProfile provider={provider} />
}
```

---

## Client Component — con estado

```typescript
// components/discovery/DeckView.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth.store'

export function DeckView() {
  const [deck, setDeck] = useState<Provider[]>([])
  const user = useAuthStore(s => s.user)

  useEffect(() => {
    loadDeck().then(setDeck)
  }, [])

  return (
    <div>
      {deck.map(provider => (
        <SwipeCard key={provider.id} provider={provider} />
      ))}
    </div>
  )
}
```

---

## Componente compartido Server + Client

El mismo componente funciona en ambos contextos:

```typescript
// components/providers/ProviderCard.tsx
// Sin 'use client' — puede usarse en Server y Client Components

interface ProviderCardProps {
  provider:  PublicProvider
  onSwipe?:  (signal: SwipeSignal) => void  // opcional — solo en el deck
  onContact?: () => void
}

export function ProviderCard({ provider, onSwipe, onContact }: ProviderCardProps) {
  return (
    <div className="...">
      <img src={provider.media[0]?.url} alt={provider.displayName} />
      <h2>{provider.displayName}</h2>
      {onContact && (
        <button onClick={onContact}>Contactar</button>
      )}
    </div>
  )
}

// Uso en Server Component (SSG — sin JS)
<ProviderCard provider={provider} />

// Uso en Client Component (deck — con interactividad)
<ProviderCard provider={provider} onSwipe={handleSwipe} onContact={handleContact} />
```

---

## API Routes

```typescript
// app/api/revalidate/route.ts

import { revalidatePath } from 'next/cache'
import { NextRequest }    from 'next/server'

export async function POST(req: NextRequest): Promise<Response> {
  const secret = req.headers.get('x-revalidate-secret')
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { slug, vertical } = await req.json() as { slug: string; vertical: string }
  revalidatePath(`/${vertical}/${slug}`)

  return Response.json({ revalidated: true })
}
```

---

## Middleware de protección de rutas

```typescript
// middleware.ts — en la raíz de apps/web/

import { NextRequest, NextResponse } from 'next/server'

const PROTECTED_PREFIXES = ['/discovery', '/saved', '/appointments', '/messages', '/profile']
const AUTH_ONLY_PREFIXES = ['/login', '/register']

export function middleware(request: NextRequest): NextResponse {
  const token = request.cookies.get('refresh_token')
  const path  = request.nextUrl.pathname

  const isProtected = PROTECTED_PREFIXES.some(p => path.startsWith(p))
  const isAuthOnly  = AUTH_ONLY_PREFIXES.some(p => path.startsWith(p))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isAuthOnly && token) {
    return NextResponse.redirect(new URL('/discovery', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
```

---

## Imports — siempre con @/ alias

```typescript
// ✅ CORRECTO
import { ProviderCard }  from '@/components/providers/ProviderCard'
import { useAuthStore }  from '@/lib/stores/auth.store'
import { apiClient }     from '@/lib/api-client'

// ❌ INCORRECTO
import { ProviderCard }  from '../../../components/providers/ProviderCard'
```

Configurar en `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./*"] }
  }
}
```

---

## next.config.ts — configuración base

```typescript
import type { NextConfig } from 'next'

const config: NextConfig = {
  output: 'standalone',       // imagen Docker optimizada para self-hosting
  images: {
    remotePatterns: [{
      protocol: 'https',
      hostname: '*.r2.cloudflarestorage.com',
    }],
  },
  // Nunca exponer variables de servidor al cliente
  // Solo las que empiezan por NEXT_PUBLIC_ llegan al browser
}

export default config
```
