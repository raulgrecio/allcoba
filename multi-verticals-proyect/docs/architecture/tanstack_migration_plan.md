# Arquitectura y Estrategia de Migración: Next.js a TanStack Start

Como arquitecto frontend, he analizado en profundidad tu solicitud. Moverse de Next.js (un framework altamente acoplado y opinionado) hacia **TanStack Start** (basado en Vite, modular y agnóstico de plataforma) es una decisión estratégica excelente si buscas **control absoluto, rendimiento predecible y una Developer Experience (DX) superior sin vendor lock-in**.

A continuación, presento la propuesta arquitectónica detallada y la estrategia de migración desde cero.

---

## 1. Routing: TanStack Router vs App Router

### Qué perdemos de Next.js
- El enrutamiento puramente basado en React Server Components (RSC) por defecto.
- Intercepting routes y parallel routes de la forma "mágica" (y a menudo frágil) en la que Next.js los implementa.

### Qué ganamos con TanStack Start
- **Tipado Estricto (End-to-End):** El router genera los tipos automáticamente. No hay rutas rotas ni parámetros de URL no definidos.
- **Search Params como Ciudadanos de Primera Clase:** Se validan con Zod en la URL y tienen tipado estricto. En Next.js, leer search params desactiva el caché estático o requiere hooks que causan re-renders complejos; en TanStack Router, están integrados en el estado del enrutador.
- **Route Context:** Permite inyectar dependencias (ej. query clients, auth state) desde el root hasta las hojas sin usar React Context puro, evitando cascadas de re-renders.
- **Loaders concurrentes reales:** Los datos se obtienen de forma paralela y predecible antes de renderizar el componente.

### Estrategia recomendada
Usaremos **File-based routing** con el plugin de Vite `@tanstack/router-plugin`. 
- `loading.tsx` -> Se maneja con el prop `pendingComponent` en la ruta.
- `error.tsx` -> Se maneja con `errorComponent`.
- `layout.tsx` -> Archivos `_layout.tsx` o archivos de ruta base.

---

## 2. Fetching y Cache: RSC/Next Cache vs TanStack Query + Server Functions

### La transición
Next.js introdujo un modelo complejo donde parchearon el `fetch` nativo y mezclaron ISR, revalidation tags y RSC. Esto genera una caja negra muy difícil de debuggear.

En TanStack Start, el modelo es explícito e increíblemente predecible:
1. **Server Functions (`createServerFn`):** Llamadas a procedimiento remoto (RPC). Son funciones que escribes junto a tu componente pero que **solo se ejecutan en el servidor**.
2. **TanStack Query:** Maneja el caché, deduplicación, refetching y state management en el cliente.
3. **Route Loaders:** Hacen "prefetch" de los datos en el servidor (SSR) y los hidratan automáticamente en TanStack Query en el cliente.

### Qué perdemos
- El ISR puro (Regeneración Estática Incremental) manejado por el servidor Edge/Vercel.

### Qué ganamos
- **Caché Inteligente y Controlado:** Sabemos exactamente cuándo expira un dato (Stale Time) y cuándo se limpia (Garbage Collection Time).
- **Streaming de datos real:** Podemos diferir consultas pesadas devolviendo promesas desde el loader, y usar `<Await>` y `<Suspense>` en la vista.
- Sin magia de `fetch` parcheado.

---

## 3. Imágenes: `next/image` vs `@unpic/react`

### El problema de `next/image`
Depende de un servidor Node.js/Edge en tiempo de ejecución para redimensionar imágenes y convertirlas a WebP/AVIF. Esto ata tu infraestructura a Vercel o requiere un servidor pesado, consumiendo CPU en cada request inicial.

### La solución: `@unpic/react`
Unpic no procesa las imágenes en tu servidor. **Delega el trabajo a un CDN de imágenes** (Cloudinary, Cloudflare Images, Imgix, etc.). Construye URLs dinámicas y etiquetas `<img>` con `srcset` y `sizes` perfectos.

**Ejemplo comparativo:**

```tsx
// Antes (Next.js)
import Image from 'next/image';
<Image src="/hero.jpg" width={800} height={600} priority alt="Hero" />

// Ahora (@unpic/react)
import { Image } from '@unpic/react';
<Image 
  src="https://cdn.tuservicio.com/hero.jpg" 
  layout="constrained" 
  width={800} 
  height={600} 
  priority 
  alt="Hero" 
/>
```

### Por qué merece la pena
- Eliminas la dependencia de la API de Next.js.
- **Mejor TTFB:** Tu servidor SSR solo renderiza HTML, no procesa bytes de imágenes.
- **CLS Perfecto:** unpic calcula el aspect ratio automáticamente.

---

## 4. SEO y SSR

TanStack Start es **Server-Side Rendered (SSR)** de serie. No hay regresión en SEO.

### Diferencias Clave
En Next.js App Router exportas una constante `metadata`. 
En TanStack Start, devuelves un array de etiquetas en el método `meta` de la configuración de tu ruta:

```tsx
// app/routes/product/$productId.tsx
export const Route = createFileRoute('/product/$productId')({
  loader: async ({ params }) => fetchProduct(params.productId),
  meta: ({ loaderData }) => [
    { title: `${loaderData.name} | Mi App` },
    { name: 'description', content: loaderData.description },
    { property: 'og:image', content: loaderData.imageUrl },
  ],
  component: ProductPage,
});
```
Se pueden construir Sitemaps y robots.txt fácilmente creando API Routes estandarizadas en TanStack Start (`app/routes/api/sitemap.ts`).

---

## 5. Arquitectura: Feature-First y Vertical Slices

Mantendremos tus wrappers UI (estilo shadcn/ui) pero reestructuraremos la lógica de negocio usando **Vertical Slices**. Esto evita el desorden crónico de Next.js donde todo termina en la carpeta de la ruta.

### Estructura Propuesta

```text
/
├── app/
│   ├── routes/                # Solo enrutamiento, loaders y llamadas a UI
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── api/               # Server API routes (webhooks, etc)
│   │
│   ├── features/              # Vertical Slices (Domain-Driven)
│   │   ├── auth/
│   │   │   ├── api/           # createServerFn() específicos de auth
│   │   │   ├── components/    # Componentes UI de auth
│   │   │   ├── schemas/       # Zod schemas compartidos
│   │   │   └── hooks/         # Hooks de TanStack Query
│   │   │
│   │   └── products/
│   │
│   ├── components/            # UI Compartida (shadcn/ui wrappers)
│   │   ├── ui/                # Button, Input, Dialog, etc.
│   │   └── layout/            # Header, Footer
│   │
│   ├── lib/                   # Infraestructura (utils, fetchers, queryClient)
│   │
│   ├── router.tsx             # Configuración principal de TanStack Router
│   ├── client.tsx             # Entry point cliente
│   └── ssr.tsx                # Entry point servidor
├── package.json
└── vite.config.ts
```

---

## 6. Formularios: TanStack Form

**React Hook Form (RHF)** es excelente, pero **TanStack Form** está diseñado para ser agnóstico del framework, Headless, y con un rendimiento extremo (granular re-rendering).

### Comparativa RHF vs TanStack Form
- **Rendimiento:** TanStack Form usa un modelo de subscripción granular. Si un input cambia, *solo ese input se renderiza*, incluso si el estado del formulario es complejo.
- **Tipado:** Tipado inferido desde el inicio. Se integra nativamente con Zod.
- **Server Functions:** Su mayor ventaja. Puedes mandar el `FormData` directamente a un `createServerFn` de TanStack Start y manejar validaciones en el servidor devolviendo los mismos tipos de error a la UI, sin boilerplate extra.

*Recomendación:* Si empezamos desde cero, **TanStack Form es superior** en sinergia con el resto del stack.

---

## 7. Rendimiento Real: Tradeoffs

| Métrica / Concepto | Next.js (App Router) | TanStack Start (Vite + Router) | Veredicto |
| :--- | :--- | :--- | :--- |
| **Bundle Size Inicial** | Muy alto (~80-100kb base) debido al runtime de RSC y Next. | Menor y altamente modularizable (tree-shaking superior de Vite). | **TanStack** gana en tamaño puro. |
| **Hydration** | Costosa. React tiene que hidratar un árbol complejo de Server y Client components mezclados. | Tradicional pero muy controlada. Ocurre una vez. | **Empate** (depende del desarrollador). |
| **Navegación (INP)** | A veces lenta si la ruta siguiente no está cacheada (Next.js hace petición al servidor por el RSC payload). | **Instantánea**. TanStack Router hace prefetch estricto (incluso al hacer hover en el link) de código y datos. | **TanStack** gana ampliamente en SPA feel. |
| **Server Load (TTFB)** | Alto. El servidor Edge procesa imágenes, RSC, cachés complejas. | Bajo. Es una app SSR estándar usando Nitro/Vite. | **TanStack** es más barato de hostear. |

---

## 8. Estrategia de Migración Incremental

Dado que solicitas una app **limpia desde cero**, la migración no se hará mezclando librerías, sino mediante el patrón **Strangler Fig (Proxy Routing)**.

### Fases:
1. **Fase 1: Setup Core.** Configurar TanStack Start, sistema de diseño (shadcn), TanStack Query, y CI/CD.
2. **Fase 2: Autenticación y Layouts.** Migrar la lógica de sesión (usando Server Functions).
3. **Fase 3: Migración Vertical (Ruta por Ruta).** 
   - Tomamos una sección independiente (ej. `/dashboard`).
   - La construimos en TanStack Start.
   - En nuestro DNS / Proxy Inverso (Cloudflare, Nginx, o Vercel rewrites), apuntamos `/dashboard` a la nueva infraestructura, y el resto sigue en Next.js.
4. **Fase 4: Final.** Una vez todas las rutas estén migradas, se apaga Next.js.

### Riesgos y Cuándo NO migrar:
- *Riesgo:* TanStack Start está madurando. Habrá breaking changes ocasionales hasta la v1 final.
- *No migrar si:* Dependes fuertemente de Vercel (Vercel KV, Vercel Blob, Next.js Image Optimization) y no quieres buscar alternativas agnósticas (Redis, S3, Unpic/Cloudinary).

---

## 9. Setup Inicial Recomendado

Usaremos `pnpm`, Vite, TypeScript estricto, Biome (para linting/formatting ultrarrápido) y Vitest.

### Comandos de Inicialización

```bash
# 1. Crear el proyecto con el template oficial
pnpm create @tanstack/start@latest ./mi-nueva-app

# 2. Entrar e instalar dependencias core
cd mi-nueva-app
pnpm install

# 3. Instalar Ecosistema TanStack y dependencias modernas
pnpm add @tanstack/react-query @tanstack/react-form zod @unpic/react
pnpm add -D tailwindcss postcss autoprefixer vite-tsconfig-paths @biomejs/biome vitest
```

### Configuración Recomendada (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import { StartPlugin } from '@tanstack/start/plugin';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    TanStackRouterVite(), // Autogeneración de rutas type-safe
    StartPlugin(),        // Habilita Server Functions y SSR
  ],
  server: {
    port: 3000,
  }
});
```

### CI/CD y Tooling
Reemplaza ESLint/Prettier por **Biome**. Es infinitamente más rápido y viene listo para usar.
Para testing, **Vitest** es el estándar de oro en aplicaciones Vite, y al compartir el mismo archivo `vite.config.ts`, tus tests entienden los alias, paths y variables de entorno automáticamente.

---

## 10. Resultado Final Esperado

Al finalizar este proceso, obtendremos:
1. **App 100% Type-Safe**: Desde la base de datos hasta los query params en la URL. Si cambias el nombre de una ruta, TypeScript te avisará en todos los `<Link>` de tu app.
2. **Independencia de Infraestructura**: Podrás desplegar en Cloudflare Pages, AWS, Vercel, Railway, o un VPS propio (gracias a Vinxi/Nitro por debajo de TanStack Start).
3. **Rendimiento Inigualable en Navegación**: El prefetching en background de TanStack Router hará que la app se sienta como un ejecutable nativo.
4. **Clean Architecture**: Separación estricta entre capa de datos (Query), enrutamiento (Router), mutaciones (Server Functions) y vista (React), resolviendo para siempre el *spaghetti code* típico de Next.js App Router.
