"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "Inicio" },
  { href: "/buscar", icon: Search, label: "Buscar" },
  { href: "/publicar", icon: PlusCircle, label: "Publicar", accent: true },
  { href: "/favoritos", icon: Heart, label: "Favoritos" },
  { href: "/perfil", icon: User, label: "Perfil" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label, accent }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 min-w-[3.5rem] py-1 px-2 rounded-xl transition-colors",
                accent
                  ? "text-accent-foreground"
                  : active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {accent ? (
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-md">
                  <Icon className="w-5 h-5 text-accent-foreground" />
                </div>
              ) : (
                <Icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
              )}
              {!accent && <span className="text-[10px] font-medium">{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
