# CLAUDE.md — packages/ui (@allcoba/ui)

Framework-agnostic React component library. No Next.js, no routing, no server imports.

## Regla fundamental

**Cualquier componente nuevo empieza aquí, no en apps/web.**
Si el componente necesita `next/link`, `useRouter`, `usePathname` → el componente está mal diseñado.
Inyecta routing/navigation como props (`LinkComponent`, `onNavigate`).

---

## Estructura

```
src/
├── components/
│   ├── primitives/   ← shadcn components (Button, Input, Badge…) — NO tocar lógica
│   ├── molecules/    ← composición con tipos de dominio (ListingCard, CategoryCard)
│   ├── patterns/     ← cómo se muestran múltiples items (ListingGrid, ListingCarousel)
│   └── shells/       ← chrome estructural (HeaderShell, FooterShell, MobileNavShell)
├── lib/
│   ├── utils.ts      ← cn()
│   ├── format.ts     ← formatPrice, timeAgo, CONDITION_LABELS
│   └── fixtures.ts   ← datos mock SOLO para stories (no exportar desde index.ts)
├── styles/
│   └── globals.css   ← Tailwind v4 + design-tokens
└── types/
    └── index.ts      ← Vertical, Listing, Category, Seller…
```

---

## Añadir un nuevo componente primitivo (shadcn)

```bash
cd packages/ui
pnpm dlx shadcn@latest add <nombre>
# El componente aparece en src/components/primitives/<nombre>.tsx
# cn se importa como: import { cn } from "@/lib/utils"  ← correcto, no tocar
```

Luego exportarlo desde `src/index.ts`:
```ts
export { NombreComponente } from "./components/primitives/nombre";
```

---

## Añadir un componente molecule/pattern

1. Crear en `src/components/molecules/` o `src/components/patterns/`
2. **Sin imports de Next.js.** Si necesita navegación → `LinkComponent` prop
3. Si necesita datos → recibir por props, no hardcodear
4. Imports internos: `../../lib/utils`, `../../types`, `../primitives/*`
5. Exportar desde `src/index.ts`
6. Crear story en `.stories.tsx` en la misma carpeta

### Patrón LinkComponent (C+ pattern)

```tsx
interface BaseLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
}

const DefaultLink = ({ href, className, children }: BaseLinkProps) => (
  <a href={href} className={className}>{children}</a>
);

interface MyCardProps {
  data: MyType;
  LinkComponent?: React.ComponentType<BaseLinkProps>;
}

export function MyCard({ data, LinkComponent = DefaultLink }: MyCardProps) {
  return <LinkComponent href={`/path/${data.id}`}>...</LinkComponent>;
}
```

---

## Añadir un Shell

Shells = chrome estructural (header, nav, footer). Reciben:
- `LinkComponent` — para todos los links internos
- `pathname` — para estado activo, viene de `usePathname()` en el app
- `onNavigate(href)` — para navegación programática (dropdown items, etc.)
- Datos de configuración como props (nav items, secciones, etc.)

Shells van en `src/components/shells/`. **Nunca importar de next/navigation ni next/link.**

---

## Usar el componente en apps/web

### Si es primitivo/molecule/pattern (dumb):
```tsx
// Importa directamente de @allcoba/ui
import { MyCard } from "@allcoba/ui";
import NextLink from "next/link";

<MyCard data={data} LinkComponent={NextLink} />
```

### Si es un shell (necesita router):
Crear wrapper en `apps/web/components/layout/MyShell.tsx`:
```tsx
"use client";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MyShell as MyShellBase } from "@allcoba/ui";

const MY_DATA = [...]; // datos específicos de la app

export function MyShell() {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <MyShellBase
      data={MY_DATA}
      pathname={pathname}
      onNavigate={(href) => router.push(href)}
      LinkComponent={NextLink as React.ComponentType<...>}
    />
  );
}
```

---

## Stories

Cada componente debe tener su `.stories.tsx` en la misma carpeta.
Usar fixtures de `../../lib/fixtures.ts` para datos de dominio.

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { LISTING_FIXTURES } from "../../lib/fixtures";
import { MyCard } from "./MyCard";

const meta: Meta<typeof MyCard> = {
  title: "Molecules/MyCard",
  component: MyCard,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof MyCard>;

export const Default: Story = {
  args: { data: LISTING_FIXTURES[0] },
};
```

Arrancar Storybook:
```bash
cd packages/ui
pnpm storybook
```

---

## Lo que NO debe estar en packages/ui

- `import Link from "next/link"` — usar LinkComponent prop
- `import { useRouter } from "next/navigation"` — prop onNavigate
- `import { usePathname } from "next/navigation"` — prop pathname
- Arrays de mock data para páginas reales → van en `apps/web/lib/mock-data.ts`
- Lógica de autenticación, stores de Zustand, fetch a APIs
