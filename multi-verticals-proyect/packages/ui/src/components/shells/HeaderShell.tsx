"use client";

import { useState } from "react";
import { Search, Heart, MessageCircle, Plus, Grid2x2, MoreHorizontal } from "lucide-react";
import { AppLogo } from "../molecules/AppLogo";
import { buttonVariants } from "../primitives/button";
import { Input } from "../primitives/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../primitives/avatar";
import { cn } from "../../lib/utils";

import { useLinkComponent } from "../providers/LinkProvider";

export interface HeaderNavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface HeaderUser {
  name: string;
  avatarUrl?: string;
}

interface BaseLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}

export interface HeaderShellProps {
  categories: HeaderNavItem[];
  user?: HeaderUser;
  onSearch: (query: string) => void;
  onNavigate: (href: string) => void;
  LinkComponent?: React.ComponentType<BaseLinkProps>;
  searchPlaceholder?: string;
}

export function HeaderShell({
  categories,
  user,
  onSearch,
  onNavigate,
  LinkComponent: propLinkComponent,
  searchPlaceholder = "Busca coches, motos, servicios...",
}: HeaderShellProps) {
  const [query, setQuery] = useState("");
  const LinkComponent = propLinkComponent || useLinkComponent();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card shadow-sm">
      {/* Main row */}
      <div className="w-full px-4 sm:px-8 h-[3.75rem] md:h-[4.25rem] flex items-center gap-3 md:gap-6">

        {/* Logo */}
        <LinkComponent href="/" className="flex-shrink-0">
          <AppLogo size="md" responsiveText />
        </LinkComponent>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 rounded-full border-border/70 bg-background focus-visible:ring-0 focus-visible:border-foreground/50 focus-visible:border-2 focus-visible:border-foreground h-10 md:h-12 text-sm"
            />
          </div>
        </form>

        {/* Desktop nav — logged in */}
        {user ? (
          <nav className="hidden md:flex items-center gap-1 flex-shrink-0">
            <LinkComponent
              href="/favoritos"
              aria-label="Favoritos"
              className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Heart className="w-8 h-8 shrink-0 stroke-[1.5]" />
              <span className="hidden lg:inline">Favoritos</span>
            </LinkComponent>

            <LinkComponent
              href="/mensajes"
              aria-label="Buzón"
              className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-8 h-8 shrink-0  stroke-[1.5]" />
              <span className="hidden lg:inline">Buzón</span>
            </LinkComponent>

            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatarUrl} alt={user.name} />
                  <AvatarFallback className="text-[0.55rem] font-bold bg-primary text-primary-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline">Tú</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem onClick={() => onNavigate("/perfil")} className="cursor-pointer">Mi perfil</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate("/mis-anuncios")} className="cursor-pointer">Mis anuncios</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate("/favoritos")} className="cursor-pointer">Favoritos</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate("/logout")} className="cursor-pointer text-destructive">Cerrar sesión</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="pl-3 border-l border-border ml-1">
              <LinkComponent
                href="/publicar"
                className={cn(buttonVariants(), "rounded-full font-bold px-5 h-10 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5")}
              >
                <Plus className="w-4 h-4" />
                Publicar
              </LinkComponent>
            </div>
          </nav>
        ) : (
          /* Desktop nav — guest */
          <nav className="hidden md:flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => onNavigate("/login")}
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full font-bold px-5 h-10")}
            >
              Iniciar sesión
            </button>
            <LinkComponent
              href="/publicar"
              className={cn(buttonVariants(), "rounded-full font-bold px-5 h-10 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5")}
            >
              <Plus className="w-4 h-4" />
              Publicar
            </LinkComponent>
          </nav>
        )}

        {/* Mobile right actions */}
        <div className="md:hidden flex items-center gap-1 flex-shrink-0">
          {user ? (
            <>
              <button
                aria-label="Categorías"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground")}
              >
                <Grid2x2 className="w-5 h-5" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground")}>
                  <MoreHorizontal className="w-5 h-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                  <DropdownMenuItem onClick={() => onNavigate("/favoritos")} className="cursor-pointer">Favoritos</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("/mensajes")} className="cursor-pointer">Buzón</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate("/perfil")} className="cursor-pointer">Mi perfil</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onNavigate("/publicar")} className="cursor-pointer font-semibold">Publicar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <LinkComponent
              href="/publicar"
              className={cn(buttonVariants({ size: "sm" }), "rounded-full font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 gap-1")}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs">Publicar</span>
            </LinkComponent>
          )}
        </div>
      </div>

      {/* Category nav */}
      <nav className="hidden sm:flex items-stretch overflow-x-auto scrollbar-hide border-t border-border/50 w-full px-4 sm:px-8 h-11 md:h-12 gap-5 md:gap-7">
        {categories.map(({ label, href, active }) => (
          <LinkComponent
            key={label}
            href={href}
            className={cn(
              "relative flex items-center flex-none text-sm whitespace-nowrap transition-colors",
              "after:absolute after:bottom-0 after:inset-x-0 after:h-[3px] after:rounded-t-sm after:transition-all after:duration-100",
              active
                ? "text-primary font-semibold after:bg-primary"
                : "text-muted-foreground hover:text-foreground after:bg-transparent hover:after:bg-border"
            )}
          >
            {label}
          </LinkComponent>
        ))}
      </nav>
    </header>
  );
}
