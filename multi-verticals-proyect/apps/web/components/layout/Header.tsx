"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, Heart, MessageCircle, User, Plus, Menu } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/buscar?q=${encodeURIComponent(q)}`);
    else router.push("/buscar");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-black text-sm leading-none">A</span>
          </div>
          <span className="text-xl font-display font-bold text-foreground tracking-tight hidden sm:block">
            allcoba
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Busca coches, motos, servicios..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 rounded-full bg-muted/60 border-transparent focus-visible:bg-background focus-visible:ring-primary h-10 text-sm"
            />
          </div>
        </form>

        {/* Nav — desktop */}
        <nav className="hidden md:flex items-center gap-1 flex-shrink-0">
          <Link
            href="/favoritos"
            aria-label="Favoritos"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground hover:text-primary")}
          >
            <Heart className="w-5 h-5" />
          </Link>
          <Link
            href="/mensajes"
            aria-label="Mensajes"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground hover:text-primary")}
          >
            <MessageCircle className="w-5 h-5" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <span className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-muted-foreground hover:text-primary cursor-pointer")}>
                <User className="w-5 h-5" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/perfil")}>
                Mi perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/mis-anuncios")}>
                Mis anuncios
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/favoritos")}>
                Favoritos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/login")}>
                Iniciar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="pl-2 border-l border-border ml-1">
            <Link
              href="/publicar"
              className={cn(
                buttonVariants(),
                "rounded-full font-semibold px-5 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
              )}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Publicar
            </Link>
          </div>
        </nav>

        {/* Mobile menu */}
        <div className="md:hidden flex items-center gap-2 flex-shrink-0">
          <Link
            href="/publicar"
            className={cn(
              buttonVariants({ size: "sm" }),
              "rounded-full font-semibold bg-accent text-accent-foreground hover:bg-accent/90"
            )}
          >
            <Plus className="w-4 h-4" />
          </Link>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
