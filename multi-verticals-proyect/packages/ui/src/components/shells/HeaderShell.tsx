"use client";

import { useState } from "react";
import { Search, Heart, MessageCircle, User, Plus } from "lucide-react";
import { buttonVariants } from "../primitives/button";
import { Input } from "../primitives/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../primitives/dropdown-menu";
import { cn } from "../../lib/utils";

export interface HeaderNavItem {
  label: string;
  href: string;
}

interface BaseLinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}

export interface HeaderShellProps {
  categories: HeaderNavItem[];
  pathname: string;
  onSearch: (query: string) => void;
  onNavigate: (href: string) => void;
  LinkComponent: React.ComponentType<BaseLinkProps>;
  searchPlaceholder?: string;
}

export function HeaderShell({
  categories,
  pathname,
  onSearch,
  onNavigate,
  LinkComponent,
  searchPlaceholder = "Busca coches, motos, servicios...",
}: HeaderShellProps) {
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-md shadow-sm">
      {/* Main row */}
      <div className="max-w-[80rem] mx-auto px-4 h-16 flex items-center gap-3">
        {/* Logo */}
        <LinkComponent href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-black text-sm leading-none">A</span>
          </div>
          <span className="text-lg font-display font-bold text-foreground tracking-tight hidden sm:block">
            allcoba
          </span>
        </LinkComponent>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 rounded-full bg-muted/60 border-transparent focus-visible:bg-background focus-visible:ring-primary h-10 text-sm"
            />
          </div>
        </form>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-shrink-0">
          <LinkComponent
            href="/favoritos"
            aria-label="Favoritos"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground hover:text-primary")}
          >
            <Heart className="w-5 h-5" />
          </LinkComponent>
          <LinkComponent
            href="/mensajes"
            aria-label="Mensajes"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground hover:text-primary")}
          >
            <MessageCircle className="w-5 h-5" />
          </LinkComponent>

          <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground hover:text-primary")}>
              <User className="w-5 h-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem onClick={() => onNavigate("/perfil")} className="cursor-pointer">Mi perfil</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate("/mis-anuncios")} className="cursor-pointer">Mis anuncios</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate("/favoritos")} className="cursor-pointer">Favoritos</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate("/login")} className="cursor-pointer">Iniciar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="pl-2 border-l border-border ml-1">
            <LinkComponent
              href="/publicar"
              className={cn(buttonVariants(), "rounded-full font-bold px-5 h-10 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm")}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Publicar
            </LinkComponent>
          </div>
        </nav>

        {/* Mobile CTA */}
        <div className="md:hidden flex items-center gap-2 flex-shrink-0">
          <LinkComponent
            href="/publicar"
            className={cn(buttonVariants({ size: "sm" }), "rounded-full font-bold bg-accent text-accent-foreground hover:bg-accent/90 h-9 px-3 gap-1")}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-xs">Publicar</span>
          </LinkComponent>
        </div>
      </div>

      {/* Category nav */}
      <nav className="hidden sm:flex items-center overflow-x-auto scrollbar-hide border-t border-border/50 max-w-[80rem] mx-auto px-4 h-9 gap-0.5">
        {categories.map(({ label, href }) => {
          const base = href.split("?")[0] ?? href;
          const active = pathname === href || (href !== "/buscar" && pathname.startsWith(base));
          return (
            <LinkComponent
              key={label}
              href={href}
              className={cn(
                "flex-none text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors",
                active
                  ? "text-primary font-semibold bg-primary/8"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {label}
            </LinkComponent>
          );
        })}
      </nav>
    </header>
  );
}
