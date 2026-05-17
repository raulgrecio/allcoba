import { createFileRoute } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { buttonVariants, ListingGrid, Link } from "@allcoba/ui";
import { SiteLayout } from "#/components/layout/SiteLayout";
import { LISTINGS } from "#/lib/mock-data";

export const Route = createFileRoute("/favoritos")({
  component: FavoritosPage,
});

const FAVORITES = LISTINGS.filter((l) => l.isFavorite);

function FavoritosPage() {
  return (
    <SiteLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-6 h-6 text-primary fill-primary/20" />
          <h1 className="text-2xl font-display font-bold text-foreground">Mis favoritos</h1>
        </div>

        {FAVORITES.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-bold mb-2 text-foreground">Sin favoritos todavía</p>
            <p className="text-sm mb-6">Guarda anuncios y aparecerán aquí.</p>
            <Link href="/buscar" className={buttonVariants({ className: "rounded-full" })}>
              Explorar anuncios
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {FAVORITES.length} anuncio{FAVORITES.length !== 1 ? "s" : ""} guardado
              {FAVORITES.length !== 1 ? "s" : ""}
            </p>
            <ListingGrid listings={FAVORITES} />
          </>
        )}
      </div>
    </SiteLayout>
  );
}
