import { createFileRoute, Link as TSRLink } from "@tanstack/react-router";
import { ArrowRight, Clock, MapPin, Sparkles, TrendingUp } from "lucide-react";

import { buttonVariants, CategoryCard, cn, ListingCarousel } from "@allcoba/ui";

import { SiteLayout } from "#/components/layout/SiteLayout";
import {
  CATEGORIES,
  FEATURED_LISTINGS,
  NEAR_LISTINGS,
  RECENT_LISTINGS,
  STATS,
} from "#/lib/mock-data";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <SiteLayout>
      {/* ── Hero ── */}
      <section className="relative bg-primary overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="max-w-[80rem] mx-auto px-4 py-14 md:py-20 text-center flex flex-col items-center gap-5 relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-black text-primary-foreground leading-tight max-w-3xl">
            Conecta sin exponerte
          </h1>
          <p className="text-primary-foreground/80 text-base md:text-lg max-w-lg">
            Coches, motos y servicios cerca de ti. Tu privacidad siempre primero.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-sm mt-1">
            <TSRLink
              to={"/buscar" as any}
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "flex-1 rounded-full font-bold h-11 shadow-lg",
              )}
            >
              Explorar
            </TSRLink>
            <TSRLink
              to={"/publicar" as any}
              className={cn(
                buttonVariants({ size: "lg" }),
                "flex-1 rounded-full font-bold h-11 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg",
              )}
            >
              Publicar gratis
            </TSRLink>
          </div>
        </div>
      </section>

      {/* ── Stats banner ── */}
      <section className="max-w-[80rem] mx-auto px-4 -mt-6 relative z-20 mb-8">
        <div className="bg-card border border-border rounded-2xl shadow-md px-6 py-4 flex flex-col sm:flex-row items-center justify-around gap-4">
          {[
            { value: STATS.totalListings.toLocaleString("es-ES"), label: "Anuncios activos" },
            { value: STATS.totalUsers.toLocaleString("es-ES"), label: "Usuarios" },
            { value: STATS.totalCategories.toString(), label: "Categorías" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl md:text-3xl font-display font-black text-primary">{value}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categorías ── */}
      <section className="max-w-[80rem] mx-auto px-4 mb-10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display font-bold text-foreground">Categorías populares</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.slug} category={cat} />
          ))}
        </div>
      </section>

      {/* ── Destacados ── */}
      <section className="bg-muted/40 py-8 mb-8">
        <div className="max-w-[80rem] mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-bold text-foreground">Destacados</h2>
            </div>
            <TSRLink
              to={"/buscar" as any}
              search={{ sort: "popular" } as any}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground hover:text-primary text-sm",
              )}
            >
              Ver más <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </TSRLink>
          </div>
          <ListingCarousel listings={FEATURED_LISTINGS} />
        </div>
      </section>

      {/* ── Lo mejor, al mejor precio ── */}
      <section className="max-w-[80rem] mx-auto px-4 mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">Cerca de ti</h2>
          </div>
          <TSRLink
            to={"/buscar" as any}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground hover:text-primary text-sm",
            )}
          >
            Ver más <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </TSRLink>
        </div>
        <ListingCarousel listings={NEAR_LISTINGS} />
      </section>

      {/* ── Recién subidos ── */}
      <section className="max-w-[80rem] mx-auto px-4 mb-16">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold text-foreground">Recién subidos</h2>
          </div>
          <TSRLink
            to={"/buscar" as any}
            search={{ sort: "recent" } as any}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground hover:text-primary text-sm",
            )}
          >
            Ver todos <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </TSRLink>
        </div>
        <ListingCarousel listings={RECENT_LISTINGS} />
      </section>
    </SiteLayout>
  );
}
