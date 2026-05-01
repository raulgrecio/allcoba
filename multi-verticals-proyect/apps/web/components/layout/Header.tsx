"use client";

import NextLink from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { HeaderShell } from "@allcoba/ui";
import type { HeaderNavItem } from "@allcoba/ui";

const CAT_NAV: HeaderNavItem[] = [
  { label: "Todo", href: "/buscar" },
  { label: "Coches", href: "/buscar?vertical=automocion&cat=coches" },
  { label: "Motos", href: "/buscar?vertical=automocion&cat=motos" },
  { label: "Masajes", href: "/buscar?vertical=masajes" },
  { label: "Recambios", href: "/buscar?vertical=automocion&cat=recambios" },
  { label: "Accesorios", href: "/buscar?vertical=automocion&cat=accesorios" },
  { label: "Cita previa", href: "/buscar?tipo=cita" },
  { label: "Envío disponible", href: "/buscar?shipping=true" },
];

export function Header() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <HeaderShell
      categories={CAT_NAV}
      pathname={pathname}
      onSearch={(q) => router.push(q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar")}
      onNavigate={(href) => router.push(href)}
      LinkComponent={NextLink as React.ComponentType<{ href: string; className?: string; children: React.ReactNode; "aria-label"?: string }>}
    />
  );
}
