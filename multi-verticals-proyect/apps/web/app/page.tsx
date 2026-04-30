import Link from "next/link";
import { ArrowRight, TrendingUp, Sparkles, MapPin } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ListingCard } from "@/components/cards/ListingCard";
import { CategoryCard } from "@/components/cards/CategoryCard";
import {
  CATEGORIES,
  FEATURED_LISTINGS,
  RECENT_LISTINGS,
  NEAR_LISTINGS,
  STATS,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <SiteLayout>
      {/* ── Hero ── */}
      <section className="relative bg-primary overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="container mx-auto px-4 py-16 md:py-24 text-center flex flex-col items-center gap-6 relative z-10">
          <h1 className="text-4xl md:text-6xl font-display font-black text-primary-foreground leading-tight max-w-3xl">
            Conecta sin exponerte
          </h1>
          <p className="text-primary-foreground/80 text-lg md:text-xl max-w-xl">
            Encuentra coches, motos y servicios cerca de ti. Tu privacidad siempre primero.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
            <Link
              href="/buscar"
              className={cn(
                buttonVariants({ variant: "secondary", size: "lg" }),
                "flex-1 rounded-full text-base font-bold h-12 shadow-lg"
              )}
            >
              Explorar
            </Link>
            <Link
              href="/publicar"
              className={cn(
                buttonVariants({ size: "lg" }),
                "flex-1 rounded-full text-base font-bold h-12 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg"
              )}
            >
              Publicar gratis
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats banner ── */}
      <section className="container mx-auto px-4 -mt-6 relative z-20 mb-6">
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

      {/* ── Categories ── */}
      <section className="container mx-auto px-4 mb-10">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold">Categorías populares</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.slug} category={cat} />
          ))}
        </div>
      </section>

      {/* ── Featured ── */}
      <section className="bg-muted/40 py-10 mb-10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold">Destacados</h2>
            </div>
            <Link
              href="/buscar?sort=popular"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground hover:text-primary")}
            >
              Ver más <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {FEATURED_LISTINGS.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Near you ── */}
      <section className="container mx-auto px-4 mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display font-bold">Cerca de ti</h2>
          </div>
          <Link
            href="/buscar"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground hover:text-primary")}
          >
            Ver más <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {NEAR_LISTINGS.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>
      </section>

      {/* ── Recent ── */}
      <section className="container mx-auto px-4 mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-bold">Recién subidos</h2>
          <Link
            href="/buscar?sort=recent"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-muted-foreground hover:text-primary")}
          >
            Ver todos <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {RECENT_LISTINGS.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} index={i} />
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
