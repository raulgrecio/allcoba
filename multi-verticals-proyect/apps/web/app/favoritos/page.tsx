import { Heart } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ListingCard } from "@/components/cards/ListingCard";
import { LISTINGS } from "@/lib/mock-data";

export const metadata = { title: "Mis favoritos" };

const FAVORITES = LISTINGS.filter((l) => l.isFavorite);

export default function FavoritosPage() {
  return (
    <SiteLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="w-6 h-6 text-primary fill-primary/20" />
          <h1 className="text-2xl font-display font-bold">Mis favoritos</h1>
        </div>

        {FAVORITES.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold mb-2">Sin favoritos todavía</p>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {FAVORITES.map((listing, i) => (
                <ListingCard key={listing.id} listing={listing} index={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
