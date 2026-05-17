"use client";

import { Link as TSRLink, useLocation } from "@tanstack/react-router";
import { Heart, Home, PlusCircle, Search, User } from "lucide-react";

import type { MobileNavItem } from "@allcoba/ui";
import { MobileNavShell } from "@allcoba/ui";

const NAV_ITEMS: MobileNavItem[] = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/buscar", icon: Search, label: "Buscar" },
  { href: "/publicar", icon: PlusCircle, label: "Publicar", accent: true },
  { href: "/favoritos", icon: Heart, label: "Favoritos" },
  { href: "/perfil", icon: User, label: "Perfil" },
];

export function MobileNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return <MobileNavShell items={NAV_ITEMS} pathname={pathname} />;
}
