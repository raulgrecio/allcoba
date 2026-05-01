import { Heart } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@allcoba/ui";
import { SiteLayout } from "@/components/layout/SiteLayout";
import { ListingGrid } from "@allcoba/ui";
import { LISTINGS } from "@/lib/mock-data";

export const metadata = { title: "Mis favoritos" };

const FAVORITES = LISTINGS.filter((l) => l.isFavorite);

export default function FavoritosPage() {
  return (
    <SiteLayout>
      <div className="max-w-[80rem] mx-auto px-[1rem] py-[2rem]">
        <div className="flex items-center gap-[0.5rem] mb-[1.5rem]">
          <Heart className="w-[1.5rem] h-[1.5rem] text-primary fill-primary/20" />
          <h1 className="text-[1.5rem] font-display font-bold text-foreground">Mis favoritos</h1>
        </div>

        {FAVORITES.length === 0 ? (
          <div className="text-center py-[5rem] text-muted-foreground">
            <Heart className="w-[3rem] h-[3rem] mx-auto mb-[1rem] opacity-20" />
            <p className="text-[1.125rem] font-bold mb-[0.5rem] text-foreground">Sin favoritos todavía</p>
            <p className="text-[0.875rem] mb-[1.5rem]">Guarda anuncios y aparecerán aquí.</p>
            <Link href="/buscar" className={buttonVariants({ className: "rounded-full" })}>
              Explorar anuncios
            </Link>
          </div>
        ) : (
          <>
            <p className="text-[0.875rem] text-muted-foreground mb-[1.5rem]">
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
