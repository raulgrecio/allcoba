"use client";

import NextLink from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { HeaderShell } from "@allcoba/ui";
import type { HeaderNavItem } from "@allcoba/ui";

const CAT_NAV: Omit<HeaderNavItem, "active">[] = [
  { label: "Todo", href: "/buscar" },
  { label: "Coches", href: "/buscar?vertical=automocion&cat=coches" },
  { label: "Motos", href: "/buscar?vertical=automocion&cat=motos" },
  { label: "Masajes", href: "/buscar?vertical=masajes" },
  { label: "Recambios", href: "/buscar?vertical=automocion&cat=recambios" },
  { label: "Accesorios", href: "/buscar?vertical=automocion&cat=accesorios" },
  { label: "Cita previa", href: "/buscar?tipo=cita" },
  { label: "Envío disponible", href: "/buscar?shipping=true" },
];

function isActive(href: string, pathname: string): boolean {
  const base = href.split("?")[0] ?? href;
  if (href === "/buscar") return pathname === "/buscar";
  return pathname === href || pathname.startsWith(base + "/") || pathname.startsWith(base + "?");
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const categories: HeaderNavItem[] = CAT_NAV.map((item) => ({
    ...item,
    active: isActive(item.href, pathname),
  }));

  // TODO: replace with real auth state (e.g. useAuthStore)
  const users = [{
    name: "Juan",
    email: "[EMAIL_ADDRESS]",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
  }, undefined];

  const user = users[0];

  return (
    <HeaderShell
      categories={categories}
      user={user}
      onSearch={(q) => router.push(q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar")}
      onNavigate={(href) => router.push(href)}
      LinkComponent={NextLink as React.ComponentType<{ href: string; className?: string; children: React.ReactNode; "aria-label"?: string }>}
    />
  );
}
