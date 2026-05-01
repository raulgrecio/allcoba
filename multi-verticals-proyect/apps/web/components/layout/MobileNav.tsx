"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, Heart, User } from "lucide-react";
import { MobileNavShell } from "@allcoba/ui";
import type { MobileNavItem } from "@allcoba/ui";

const NAV_ITEMS: MobileNavItem[] = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/buscar", icon: Search, label: "Buscar" },
  { href: "/publicar", icon: PlusCircle, label: "Publicar", accent: true },
  { href: "/favoritos", icon: Heart, label: "Favoritos" },
  { href: "/perfil", icon: User, label: "Perfil" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <MobileNavShell
      items={NAV_ITEMS}
      pathname={pathname}
      LinkComponent={NextLink as React.ComponentType<{ href: string; className?: string; children: React.ReactNode }>}
    />
  );
}
