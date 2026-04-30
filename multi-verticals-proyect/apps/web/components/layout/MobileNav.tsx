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
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-md border-t border-border pb-safe">
      <div className="flex items-center justify-around h-[4.5rem] px-[0.5rem]">
        {NAV_ITEMS.map(({ href, icon: Icon, label, accent }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-[0.125rem] min-w-[4rem] py-[0.5rem] transition-all active:scale-95",
                accent
                  ? "text-accent-foreground"
                  : active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              {accent ? (
                <div className="w-[2.75rem] h-[2.75rem] rounded-full bg-accent flex items-center justify-center shadow-lg -mt-[1.5rem] border-[0.25rem] border-card">
                  <Icon className="w-[1.25rem] h-[1.25rem] text-accent-foreground" />
                </div>
              ) : (
                <Icon className={cn("w-[1.25rem] h-[1.25rem]", active && "stroke-[2.5px]")} />
              )}
              <span className={cn(
                "text-[0.625rem] font-bold uppercase tracking-wider",
                accent ? "mt-[0.25rem]" : ""
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
